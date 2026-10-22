import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  AI_NAMES,
  COMMUNITY_EVENT_OFFSETS_SECONDS,
  GAME_CONFIG,
  PROPOSALS,
  assignComboTask,
  assignRoles,
  buildTaskDeck,
  computeApartmentValue,
  drawTaskHand,
  getShopItem,
  pickPresidentStyle,
  planComposition,
  selectRoundEvents,
  type CommunityEvent,
  type Phase,
  type PlayerKind,
  type PlayerState,
  type PlayerTask,
  type PresidentStyleId,
  type RoleId,
  type RoomState,
  type RoundResult,
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
  money: number;
  lastPct: number | null;
  purchasedItems: string[];
  apartmentValue: number;
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
  /** Detección de solapamiento para el juez. */
  overlapSince: number;
  lastJudgeAt: number;
  /** Agenda privada de cada humano en la ronda actual. */
  tasksByPlayer: Map<string, PlayerTask[]>;
  /** Tareas ya usadas por jugador para no repetirlas entre rondas. */
  usedTasksByPlayer: Map<string, Set<string>>;
  /** Sucesos programados y el que está activo. */
  eventSchedule: Array<{ at: number; event: CommunityEvent }>;
  eventCursor: number;
  currentEvent: CommunityEvent | null;
  /** Juicio de la ronda. */
  latestResult: RoundResult | null;
  judgePending: boolean;
  isGameOver: boolean;
  winnerId: string | null;
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
    money: 0,
    lastPct: null,
    purchasedItems: [],
    apartmentValue: 0,
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
    money: 0,
    lastPct: null,
    purchasedItems: [],
    apartmentValue: 0,
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
      overlapSince: 0,
      lastJudgeAt: 0,
      tasksByPlayer: new Map(),
      usedTasksByPlayer: new Map(),
      eventSchedule: [],
      eventCursor: 0,
      currentEvent: null,
      latestResult: null,
      judgePending: false,
      isGameOver: false,
      winnerId: null,
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
    room.latestResult = null;
    room.judgePending = false;
    room.isGameOver = false;
    room.winnerId = null;
    for (const player of room.players.values()) {
      player.money = 0;
      player.lastPct = null;
      player.orderWarnings = 0;
      player.purchasedItems = [];
      player.apartmentValue = 0;
    }
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
    room.overlapSince = 0;
    room.lastJudgeAt = 0;
    room.lastActivityAt = now;
    this.assignRoundTasks(room);
    this.assignRoundEvents(room, now);

    console.log(
      `[rooms] Sala ${code}: comienza la discusión (${GAME_CONFIG.DISCUSSION_SECONDS}s, ronda ${room.round})`,
    );
    return room;
  }

  /** El anfitrión puede cerrar la discusión antes de que acabe el temporizador. */
  endDiscussion(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede cerrar la discusión.");
    }
    if (room.phase !== "DISCUSSION") {
      throw new GameError("NOT_IN_DISCUSSION", "La discusión no está en curso.");
    }
    room.phase = "JUDGMENT";
    room.discussionEndsAt = null;
    this.cancelAiSpeech(room.code);
    for (const player of room.players.values()) {
      player.speaking = false;
    }
    room.lastActivityAt = Date.now();
    console.log(`[rooms] Sala ${code}: discusión cerrada por el anfitrión`);
    return room;
  }

  /** Pasa al siguiente round tras ver los resultados. */
  startNextRound(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede pasar de ronda.");
    }
    if (room.phase !== "RESULTS_SHOP") {
      throw new GameError("NOT_IN_RESULTS", "Todavía no hay resultados que cerrar.");
    }
    if (room.isGameOver || room.round >= GAME_CONFIG.ROUNDS) {
      throw new GameError("NOT_IN_RESULTS", "La partida ya ha terminado.");
    }

    const now = Date.now();
    room.round += 1;
    room.phase = "DISCUSSION";
    room.discussionEndsAt = now + GAME_CONFIG.DISCUSSION_SECONDS * 1000;
    room.latestResult = null;
    room.judgePending = false;
    room.currentEvent = null;
    room.overlapSince = 0;
    room.lastJudgeAt = 0;
    room.judgeSpeakingUntil = 0;
    room.lastHumanSpokeAt = now;
    room.lastAiSpokeAt = 0;
    room.aiNextAttemptAt = 0;
    room.aiSpeakingUntil = 0;
    room.aiSpeakingPlayerId = null;
    room.aiTurns.clear();
    room.aiTurnCursor = 0;
    room.aiGenerationPending = false;
    room.aiGenerationToken += 1;
    for (const player of room.players.values()) {
      player.orderWarnings = 0;
      player.speaking = false;
      player.silencedUntil = null;
    }
    this.assignRoundTasks(room);
    this.assignRoundEvents(room, now);
    room.lastActivityAt = now;
    console.log(`[rooms] Sala ${code}: comienza la ronda ${room.round}`);
    return room;
  }

  /** Marca que el juez está trabajando; evita juicios duplicados. */
  beginJudgment(code: string): Room | null {
    const room = this.rooms.get(normalizeCode(code));
    if (!room || room.phase !== "JUDGMENT" || room.judgePending) return null;
    room.judgePending = true;
    return room;
  }

  releaseJudgment(code: string): void {
    const room = this.rooms.get(normalizeCode(code));
    if (room) room.judgePending = false;
  }

  applyRoundResult(code: string, result: RoundResult): Room {
    const room = this.getRoomOrThrow(code);
    room.latestResult = result;
    room.judgePending = false;
    room.phase = "RESULTS_SHOP";
    room.discussionEndsAt = null;

    for (const playerResult of result.players) {
      const player = room.players.get(playerResult.playerId);
      if (!player) continue;
      player.money += playerResult.money;
      player.lastPct = playerResult.totalPct;
    }

    if (room.round >= GAME_CONFIG.ROUNDS) {
      room.isGameOver = true;
      this.recomputeWinner(room);
      const winner = room.winnerId ? room.players.get(room.winnerId) : null;
      console.log(
        `[judge] Sala ${code}: fin de la partida. Ganador provisional: ${winner?.name ?? "nadie"} ` +
          `(${winner?.apartmentValue ?? 0} puntos de piso)`,
      );
    }

    room.lastActivityAt = Date.now();
    return room;
  }

  /** Compra un objeto en la tienda. Solo se puede comprar una vez por jugador. */
  buyItem(code: string, playerId: string, itemId: string): Room {
    const room = this.getRoomOrThrow(code);
    const player = this.requirePlayer(room, playerId);
    if (room.phase !== "RESULTS_SHOP") {
      throw new GameError("NOT_IN_RESULTS", "La tienda solo está abierta al acabar la ronda.");
    }
    if (player.kind !== "human") {
      throw new GameError("INVALID_REQUEST", "Los vecinos IA no tienen piso propio.");
    }
    const item = getShopItem(itemId);
    if (!item) {
      throw new GameError("INVALID_REQUEST", "Ese objeto no existe.");
    }
    if (player.purchasedItems.includes(item.id)) {
      throw new GameError("INVALID_REQUEST", "Ya tienes ese objeto en tu piso.");
    }
    if (player.money < item.price) {
      throw new GameError(
        "INVALID_REQUEST",
        `No te llega el dinero: necesitas ${item.price} € y tienes ${player.money} €.`,
      );
    }

    player.money -= item.price;
    player.purchasedItems.push(item.id);
    player.apartmentValue = computeApartmentValue(player.purchasedItems);
    if (room.isGameOver) {
      this.recomputeWinner(room);
    }
    room.lastActivityAt = Date.now();
    console.log(
      `[shop] ${player.name}@${room.code} compró ${item.name} por ${item.price} € ` +
        `(piso: ${player.apartmentValue} puntos, quedan ${player.money} €)`,
    );
    return room;
  }

  private recomputeWinner(room: Room): void {
    const humans = [...room.players.values()].filter((player) => player.kind === "human");
    const winner = [...humans].sort(
      (a, b) => b.apartmentValue - a.apartmentValue || b.money - a.money,
    )[0];
    room.winnerId = winner?.id ?? null;
  }

  private assignRoundTasks(room: Room): void {
    const hands = new Map<string, PlayerTask[]>();
    const comboParticipants: Array<{ id: string; name: string; roleId: RoleId }> = [];

    for (const player of room.players.values()) {
      if (player.kind !== "human" || !player.roleId) continue;
      const deck = buildTaskDeck(player.roleId, room.presidentStyleId);
      const used = room.usedTasksByPlayer.get(player.id) ?? new Set<string>();
      const hand: PlayerTask[] = drawTaskHand(deck, Math.random, used).map((task) => ({
        ...task,
        kind: "solo",
      }));
      for (const task of hand) used.add(task.id);
      room.usedTasksByPlayer.set(player.id, used);
      hands.set(player.id, hand);
      comboParticipants.push({ id: player.id, name: player.name, roleId: player.roleId });
    }

    const combo = assignComboTask(hands, comboParticipants);
    room.tasksByPlayer = hands;
    console.log(
      `[tasks] Sala ${room.code}: ${hands.size} agendas de 4 tareas` +
        (combo
          ? ` · combo ${combo.combo.id} (${combo.players[0].name} + ${combo.players[1].name})`
          : " · sin combo (faltan roles compatibles)"),
    );
  }

  private assignRoundEvents(room: Room, now: number): void {
    const presentRoles = [...room.players.values()]
      .map((player) => player.roleId)
      .filter((roleId): roleId is RoleId => roleId !== null);
    const events = selectRoundEvents(presentRoles);
    room.currentEvent = null;
    room.eventCursor = 0;
    room.eventSchedule = events.map((event, index) => ({
      at: now + (COMMUNITY_EVENT_OFFSETS_SECONDS[index] ?? index * 60) * 1000,
      event,
    }));
    console.log(
      `[events] Sala ${room.code}: ${events.map((event) => event.id).join(", ")}`,
    );
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

  /** Tick del reloj de sala: fin de discusión, sucesos y fin del turno de una IA. */
  tick(now = Date.now()): {
    changed: string[];
    events: Array<{ code: string; event: CommunityEvent }>;
  } {
    const changed: string[] = [];
    const events: Array<{ code: string; event: CommunityEvent }> = [];

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

      if (room.phase === "DISCUSSION") {
        while (room.eventCursor < room.eventSchedule.length) {
          const scheduled = room.eventSchedule[room.eventCursor];
          if (!scheduled || scheduled.at > now) break;
          room.eventCursor += 1;
          room.currentEvent = scheduled.event;
          this.addTranscriptEntry(room.code, {
            playerId: null,
            playerName: "Comunidad",
            roleId: null,
            text: `📢 ${scheduled.event.title}: ${scheduled.event.description}`,
            source: "system",
          });
          events.push({ code: room.code, event: scheduled.event });
          changed.push(room.code);
          console.log(`[events] ${room.code}: ${scheduled.event.title}`);
        }
      }

      if (room.aiSpeakingPlayerId && now >= room.aiSpeakingUntil) {
        this.finishAiSpeech(room.code);
        changed.push(room.code);
      }
    }
    return { changed, events };
  }

  getDiscussionRooms(): Room[] {
    return this.getRoomsInPhase("DISCUSSION");
  }

  getRoomsInPhase(phase: Phase): Room[] {
    return [...this.rooms.values()].filter((room) => room.phase === phase);
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(normalizeCode(code)) ?? null;
  }

  /** Agenda privada de un humano (nunca se incluye en RoomState). */
  getTasksForPlayer(code: string, playerId: string): PlayerTask[] {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) return [];
    return [...(room.tasksByPlayer.get(playerId) ?? [])];
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
          money: player.money,
          lastPct: player.lastPct,
          purchasedItems: [...player.purchasedItems],
          apartmentValue: player.apartmentValue,
        }),
      ),
      transcript: [...room.transcript],
      createdAt: room.createdAt,
      discussionEndsAt: room.discussionEndsAt,
      presidentStyleId: room.presidentStyleId,
      currentEvent: room.currentEvent,
      latestResult: room.latestResult,
      isGameOver: room.isGameOver,
      winnerId: room.winnerId,
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
