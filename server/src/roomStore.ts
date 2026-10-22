import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  AI_NAMES,
  GAME_CONFIG,
  PROPOSALS,
  assignRoles,
  pickPresidentStyle,
  planComposition,
  type Phase,
  type PlayerKind,
  type PlayerState,
  type PresidentStyleId,
  type RoleId,
  type RoomState,
  type TranscriptEntry,
  type TranscriptSource,
  type VoiceProfile,
} from "@shared/index";
import { getAiVoiceProfile } from "./ai/voices.js";
import { GameError } from "./errors.js";

/** Códigos sin vocales para evitar confusiones al dictarlos por voz. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface RoomPlayer {
  id: string;
  name: string;
  kind: PlayerKind;
  isHost: boolean;
  token: string;
  roleId: RoleId | null;
  connected: boolean;
  speaking: boolean;
  silencedUntil: number | null;
  orderWarnings: number;
  joinedAt: number;
  /** Solo en IA: perfil de voz para speechSynthesis. */
  voiceProfile: VoiceProfile | null;
}

export interface Room {
  code: string;
  phase: Phase;
  round: number;
  proposal: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  transcript: TranscriptEntry[];
  createdAt: number;
  lastActivityAt: number;
  discussionEndsAt: number | null;
  presidentStyleId: PresidentStyleId | null;
  /** Dirección de vecinos IA. */
  lastHumanSpokeAt: number;
  lastAiSpokeAt: number;
  aiNextAttemptAt: number;
  aiSpeakingUntil: number;
  aiSpeakingPlayerId: string | null;
  aiTurns: Map<string, number>;
  aiTurnCursor: number;
  aiGenerationPending: boolean;
  aiGenerationToken: number;
  judgeSpeakingUntil: number;
}

export interface JoinResult {
  room: Room;
  player: RoomPlayer;
  token: string;
  reconnected: boolean;
}

export interface CreateRoomResult {
  room: Room;
  player: RoomPlayer;
  token: string;
}

function randomToken(): string {
  return randomBytes(24).toString("base64url");
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function makeHuman(name: string, isHost: boolean): RoomPlayer {
  return {
    id: randomUUID(),
    name,
    kind: "human",
    isHost,
    token: randomToken(),
    roleId: null,
    connected: true,
    speaking: false,
    silencedUntil: null,
    orderWarnings: 0,
    joinedAt: Date.now(),
    voiceProfile: null,
  };
}

function makeAi(name: string, aiIndex: number): RoomPlayer {
  return {
    id: `ai-${randomUUID()}`,
    name,
    kind: "ai",
    isHost: false,
    token: randomToken(),
    roleId: null,
    connected: true,
    speaking: false,
    silencedUntil: null,
    orderWarnings: 0,
    joinedAt: Date.now(),
    voiceProfile: getAiVoiceProfile(aiIndex, name),
  };
}

function countKind(room: Room, kind: PlayerKind): number {
  let total = 0;
  for (const player of room.players.values()) {
    if (player.kind === kind) total += 1;
  }
  return total;
}

function pickProposal(): string {
  const index = randomInt(0, PROPOSALS.length);
  return PROPOSALS[index] ?? PROPOSALS[0];
}

export class RoomStore {
  private readonly rooms = new Map<string, Room>();

  createRoom(hostName: string): CreateRoomResult {
    const code = this.generateCode();
    const host = makeHuman(hostName, true);
    const now = Date.now();
    const room: Room = {
      code,
      phase: "LOBBY",
      round: 0,
      proposal: pickProposal(),
      hostId: host.id,
      players: new Map([[host.id, host]]),
      transcript: [],
      createdAt: now,
      lastActivityAt: now,
      discussionEndsAt: null,
      presidentStyleId: null,
      lastHumanSpokeAt: now,
      lastAiSpokeAt: 0,
      aiNextAttemptAt: 0,
      aiSpeakingUntil: 0,
      aiSpeakingPlayerId: null,
      aiTurns: new Map(),
      aiTurnCursor: 0,
      aiGenerationPending: false,
      aiGenerationToken: 0,
      judgeSpeakingUntil: 0,
    };
    this.rooms.set(code, room);
    console.log(`[rooms] Sala ${code} creada por ${host.name} (${host.id})`);
    return { room, player: host, token: host.token };
  }

  joinRoom(input: {
    code: string;
    name: string;
    playerId?: string | undefined;
    token?: string | undefined;
  }): JoinResult {
    const code = normalizeCode(input.code);
    const room = this.getRoomOrThrow(code);
    room.lastActivityAt = Date.now();

    // 1) Reconexión autenticada por playerId + token (recarga de página).
    if (input.playerId) {
      const existing = room.players.get(input.playerId);
      if (existing) {
        if (existing.kind !== "human") {
          throw new GameError("UNAUTHORIZED", "Ese asiento pertenece a un vecino IA.");
        }
        if (!input.token || existing.token !== input.token) {
          throw new GameError(
            "UNAUTHORIZED",
            "No se pudo validar tu sesión. Vuelve a entrar con tu nombre.",
          );
        }
        existing.connected = true;
        console.log(`[rooms] ${existing.name} se reconectó a ${code} (${existing.id})`);
        return { room, player: existing, token: existing.token, reconnected: true };
      }
      // Token local de una sala ya borrada: se ignora y se trata como entrada nueva.
    }

    // 2) Recuperación por código + nombre si el asiento está desconectado.
    const byName = [...room.players.values()].find(
      (player) => player.kind === "human" && normalizeName(player.name) === normalizeName(input.name),
    );
    if (byName) {
      if (byName.connected) {
        throw new GameError("NAME_TAKEN", "Ya hay alguien con ese nombre en la sala.");
      }
      byName.connected = true;
      byName.token = randomToken();
      console.log(`[rooms] ${byName.name} recuperó su asiento en ${code} por nombre (${byName.id})`);
      return { room, player: byName, token: byName.token, reconnected: true };
    }

    // 3) Entrada nueva: solo en lobby y si hay aforo.
    if (room.phase !== "LOBBY") {
      throw new GameError(
        "GAME_STARTED",
        "La partida ya ha empezado. Solo pueden volver los jugadores que ya estaban.",
      );
    }
    if (room.players.size >= GAME_CONFIG.MAX_PARTICIPANTS) {
      throw new GameError("ROOM_FULL", "La sala está llena (máximo 8 participantes).");
    }

    const player = makeHuman(input.name, false);
    room.players.set(player.id, player);
    console.log(`[rooms] ${player.name} entró en ${code} (${player.id})`);
    return { room, player, token: player.token, reconnected: false };
  }

  addAi(code: string, requesterId: string): RoomPlayer {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede añadir vecinos IA.");
    }
    if (room.phase !== "LOBBY") {
      throw new GameError("NOT_IN_LOBBY", "Ya no se pueden añadir vecinos IA.");
    }
    return this.addAiInternal(room);
  }

  private addAiInternal(room: Room): RoomPlayer {
    const aiCount = countKind(room, "ai");
    if (aiCount >= GAME_CONFIG.MAX_AI_PLAYERS) {
      throw new GameError("AI_LIMIT", `Máximo ${GAME_CONFIG.MAX_AI_PLAYERS} vecinos IA.`);
    }
    if (room.players.size >= GAME_CONFIG.MAX_PARTICIPANTS) {
      throw new GameError(
        "ROOM_FULL",
        `La sala está llena (máximo ${GAME_CONFIG.MAX_PARTICIPANTS} participantes).`,
      );
    }

    const usedNames = new Set([...room.players.values()].map((player) => player.name));
    const availableName = AI_NAMES.find((name) => !usedNames.has(name));
    const name = availableName ?? `Vecino IA ${aiCount + 1}`;
    const player = makeAi(name, aiCount);
    room.players.set(player.id, player);
    room.lastActivityAt = Date.now();
    console.log(`[rooms] IA "${name}" añadida a ${room.code} por el anfitrión`);
    return player;
  }

  removeAi(code: string, requesterId: string, aiPlayerId: string): void {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede quitar vecinos IA.");
    }
    if (room.phase !== "LOBBY") {
      throw new GameError("NOT_IN_LOBBY", "Ya no se pueden quitar vecinos IA.");
    }
    const target = room.players.get(aiPlayerId);
    if (!target || target.kind !== "ai") {
      throw new GameError("PLAYER_NOT_FOUND", "Ese vecino IA no existe.");
    }
    room.players.delete(aiPlayerId);
    room.lastActivityAt = Date.now();
    console.log(`[rooms] IA "${target.name}" retirada de ${room.code}`);
  }

  startGame(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede empezar la junta.");
    }
    if (room.phase !== "LOBBY") {
      throw new GameError("NOT_IN_LOBBY", "La partida ya ha empezado.");
    }

    const humans = countKind(room, "human");
    const ai = countKind(room, "ai");
    const plan = planComposition({ humans, ai });
    if (!plan.ok) {
      throw new GameError("INVALID_COMPOSITION", plan.errors.join(" "));
    }

    for (let i = 0; i < plan.aiToAdd; i += 1) {
      this.addAiInternal(room);
    }

    const participants = [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      kind: player.kind,
    }));
    const assignments = assignRoles(participants);

    for (const assignment of assignments) {
      const player = room.players.get(assignment.playerId);
      if (player) {
        player.roleId = assignment.roleId;
      }
    }

    room.phase = "ROLES";
    room.round = 1;
    room.lastActivityAt = Date.now();
    room.presidentStyleId = assignments.some((assignment) => assignment.roleId === "president")
      ? pickPresidentStyle()
      : null;

    const summary = assignments
      .map((assignment) => {
        const player = room.players.get(assignment.playerId);
        return `${player?.name ?? assignment.playerId}=${assignment.roleId}`;
      })
      .join(", ");
    console.log(
      `[rooms] Sala ${code} empieza (roles): ${summary}` +
        (room.presidentStyleId ? ` · presidencia: ${room.presidentStyleId}` : ""),
    );
    return room;
  }

  /** El anfitrión pasa del reparto de roles a la discusión con temporizador. */
  startDiscussion(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede comenzar la discusión.");
    }
    if (room.phase !== "ROLES") {
      throw new GameError("NOT_IN_ROLES", "La discusión solo puede empezar tras el reparto de roles.");
    }

    const now = Date.now();
    room.phase = "DISCUSSION";
    room.round = 1;
    room.discussionEndsAt = now + GAME_CONFIG.DISCUSSION_SECONDS * 1000;
    room.lastHumanSpokeAt = now;
    room.lastAiSpokeAt = 0;
    room.aiNextAttemptAt = 0;
    room.aiSpeakingUntil = 0;
    room.aiSpeakingPlayerId = null;
    room.aiTurns.clear();
    room.aiTurnCursor = 0;
    room.aiGenerationPending = false;
    room.aiGenerationToken += 1;
    room.judgeSpeakingUntil = 0;
    room.lastActivityAt = now;

    console.log(
      `[rooms] Sala ${code}: comienza la discusión (${GAME_CONFIG.DISCUSSION_SECONDS}s, ronda ${room.round})`,
    );
    return room;
  }

  chat(code: string, playerId: string, text: string): TranscriptEntry {
    const room = this.getRoomOrThrow(code);
    const player = this.requirePlayer(room, playerId);
    const entry: TranscriptEntry = {
      id: randomUUID(),
      at: Date.now(),
      playerId: player.id,
      playerName: player.name,
      roleId: player.roleId,
      text: text.trim(),
      source: "chat",
    };
    this.pushTranscript(room, entry);
    room.lastActivityAt = Date.now();
    console.log(`[chat] ${room.code} ${player.name}: ${entry.text.slice(0, 120)}`);
    return entry;
  }

  /** Entrada generada por el servidor (p. ej. transcripción de voz en el Hito 2). */
  addTranscriptEntry(
    code: string,
    input: {
      playerId: string | null;
      playerName: string;
      roleId: RoleId | null;
      text: string;
      source: TranscriptSource;
    },
  ): TranscriptEntry {
    const room = this.getRoomOrThrow(code);
    const entry: TranscriptEntry = {
      id: randomUUID(),
      at: Date.now(),
      ...input,
    };
    this.pushTranscript(room, entry);
    room.lastActivityAt = Date.now();
    return entry;
  }

  private pushTranscript(room: Room, entry: TranscriptEntry): void {
    room.transcript.push(entry);
    if (room.transcript.length > GAME_CONFIG.MAX_TRANSCRIPT_ENTRIES) {
      room.transcript.splice(0, room.transcript.length - GAME_CONFIG.MAX_TRANSCRIPT_ENTRIES);
    }
  }

  setSpeaking(code: string, playerId: string, speaking: boolean): boolean {
    const room = this.getRoomOrThrow(code);
    const player = room.players.get(playerId);
    if (!player || player.kind !== "human") return false;
    if (player.speaking === speaking) return false;
    player.speaking = speaking;
    if (speaking) {
      room.lastHumanSpokeAt = Date.now();
      // Un humano toma la palabra: se corta cualquier IA en curso.
      this.cancelAiSpeech(room.code);
    }
    return true;
  }

  /**
   * Cancela la IA que esté hablando o generando. Se llama cuando un humano empieza
   * a hablar o cuando cambia la fase.
   */
  cancelAiSpeech(code: string): Room | null {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) return null;
    room.aiGenerationToken += 1;
    room.aiGenerationPending = false;
    room.aiSpeakingUntil = 0;
    if (room.aiSpeakingPlayerId) {
      const speaker = room.players.get(room.aiSpeakingPlayerId);
      if (speaker) speaker.speaking = false;
      room.aiSpeakingPlayerId = null;
    }
    return room;
  }

  /** Registra una intervención de IA y la marca como hablante durante `durationMs`. */
  startAiSpeech(
    code: string,
    playerId: string,
    text: string,
    durationMs: number,
  ): { room: Room; entry: TranscriptEntry } {
    const room = this.getRoomOrThrow(code);
    const player = room.players.get(playerId);
    if (!player || player.kind !== "ai" || !player.roleId) {
      throw new GameError("PLAYER_NOT_FOUND", "El vecino IA no está listo para hablar.");
    }
    const now = Date.now();
    const entry = this.addTranscriptEntry(code, {
      playerId: player.id,
      playerName: player.name,
      roleId: player.roleId,
      text,
      source: "ai",
    });
    player.speaking = true;
    room.aiSpeakingPlayerId = player.id;
    room.aiSpeakingUntil = now + durationMs;
    room.lastAiSpokeAt = now;
    room.aiNextAttemptAt = 0;
    room.aiTurns.set(player.id, (room.aiTurns.get(player.id) ?? 0) + 1);
    return { room, entry };
  }

  finishAiSpeech(code: string): Room | null {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) return null;
    if (room.aiSpeakingPlayerId) {
      const speaker = room.players.get(room.aiSpeakingPlayerId);
      if (speaker) speaker.speaking = false;
      room.aiSpeakingPlayerId = null;
    }
    room.aiSpeakingUntil = 0;
    return room;
  }

  /** Tick del reloj de sala: fin de discusión y fin del turno de una IA. */
  tick(now = Date.now()): string[] {
    const changed: string[] = [];
    for (const room of this.rooms.values()) {
      if (room.phase === "DISCUSSION" && room.discussionEndsAt !== null && now >= room.discussionEndsAt) {
        room.phase = "JUDGMENT";
        room.discussionEndsAt = null;
        this.cancelAiSpeech(room.code);
        for (const player of room.players.values()) {
          player.speaking = false;
        }
        room.lastActivityAt = now;
        changed.push(room.code);
        console.log(`[rooms] Sala ${room.code}: fin de la discusión, comienza el juicio`);
        continue;
      }
      if (room.aiSpeakingPlayerId && now >= room.aiSpeakingUntil) {
        this.finishAiSpeech(room.code);
        changed.push(room.code);
      }
    }
    return changed;
  }

  getDiscussionRooms(): Room[] {
    return [...this.rooms.values()].filter((room) => room.phase === "DISCUSSION");
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(normalizeCode(code)) ?? null;
  }

  disconnect(code: string, playerId: string): boolean {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) return false;
    const player = room.players.get(playerId);
    if (!player) return false;
    player.connected = false;
    player.speaking = false;
    room.lastActivityAt = Date.now();
    console.log(`[rooms] ${player.name} se desconectó de ${room.code}`);
    return true;
  }

  /** Autentica una petición HTTP (STT, tokens de LiveKit) contra la sesión de la sala. */
  authenticate(code: string, playerId: string, token: string): RoomPlayer {
    const room = this.getRoomOrThrow(code);
    const player = room.players.get(playerId);
    if (!player) {
      throw new GameError("PLAYER_NOT_FOUND", "Jugador no encontrado en la sala.");
    }
    if (player.token !== token) {
      throw new GameError("UNAUTHORIZED", "Sesión no válida.");
    }
    return player;
  }

  getRoomOrThrow(code: string): Room {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) {
      throw new GameError("ROOM_NOT_FOUND", "No existe ninguna sala con ese código.");
    }
    return room;
  }

  getPublicState(room: Room): RoomState {
    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      proposal: room.proposal,
      hostId: room.hostId,
      players: [...room.players.values()].map(
        (player): PlayerState => ({
          id: player.id,
          name: player.name,
          kind: player.kind,
          isHost: player.isHost,
          connected: player.connected,
          roleId: player.roleId,
          speaking: player.speaking,
          silencedUntil: player.silencedUntil,
          orderWarnings: player.orderWarnings,
        }),
      ),
      transcript: [...room.transcript],
      createdAt: room.createdAt,
      discussionEndsAt: room.discussionEndsAt,
      presidentStyleId: room.presidentStyleId,
    };
  }

  private requirePlayer(room: Room, playerId: string): RoomPlayer {
    const player = room.players.get(playerId);
    if (!player) {
      throw new GameError("PLAYER_NOT_FOUND", "No estás en esta sala.");
    }
    return player;
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = "";
      for (let i = 0; i < GAME_CONFIG.ROOM_CODE_LENGTH; i += 1) {
        code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError("SERVER_ERROR", "No se pudo generar un código de sala.");
  }

  /** Borra salas sin humanos conectados tras el TTL. */
  cleanupStaleRooms(now = Date.now()): number {
    let removed = 0;
    for (const [code, room] of this.rooms) {
      const hasConnectedHuman = [...room.players.values()].some(
        (player) => player.kind === "human" && player.connected,
      );
      if (!hasConnectedHuman && now - room.lastActivityAt > GAME_CONFIG.ROOM_TTL_MS) {
        this.rooms.delete(code);
        removed += 1;
        console.log(`[rooms] Sala ${code} eliminada por inactividad`);
      }
    }
    return removed;
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}
