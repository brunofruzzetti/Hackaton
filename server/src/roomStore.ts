import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  AI_NAMES,
  GAME_CONFIG,
  PROPOSALS,
  assignRoles,
  planComposition,
  type Phase,
  type PlayerKind,
  type PlayerState,
  type RoleId,
  type RoomState,
  type TranscriptEntry,
  type TranscriptSource,
} from "@shared/index";
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
  };
}

function makeAi(name: string): RoomPlayer {
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
      throw new GameError("ROOM_FULL", "La sala está llena (máximo 8 participantes).");
    }

    const usedNames = new Set([...room.players.values()].map((player) => player.name));
    const availableName = AI_NAMES.find((name) => !usedNames.has(name));
    const name = availableName ?? `Vecino IA ${aiCount + 1}`;
    const player = makeAi(name);
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

    const summary = assignments
      .map((assignment) => {
        const player = room.players.get(assignment.playerId);
        return `${player?.name ?? assignment.playerId}=${assignment.roleId}`;
      })
      .join(", ");
    console.log(`[rooms] Sala ${code} empieza (roles): ${summary}`);
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
    return true;
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
