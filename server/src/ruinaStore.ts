import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  RUINA_AI_NAMES,
  RUINA_CONTRACTS,
  RUINA_FLOORS,
  RUINA_MAX_AI,
  RUINA_MAX_PLAYERS,
  RUINA_MAX_REJECTIONS,
  RUINA_MIN_PLAYERS,
  iniciarPartida,
  ruinaTeamSplit,
  type RuinaChatMessage,
  type RuinaContract,
  type RuinaFloor,
  type RuinaPhase,
  type RuinaPrivateInfo,
  type RuinaRoundReason,
  type RuinaRoundResult,
  type RuinaSecret,
  type RuinaState,
  type RuinaTeam,
  type RuinaVoteResult,
} from "@shared/index";
import { GameError } from "./errors.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NOMINATION_MS = 60_000;
const VOTE_MS = 90_000;
const SIGN_MS = 60_000;
const RESOLUTION_MS = 8_000;

export interface RoomPlayer {
  id: string;
  nombre: string;
  piso: RuinaFloor;
  team: RuinaTeam | null;
  isHost: boolean;
  isAi: boolean;
  token: string;
  connected: boolean;
  joinedAt: number;
}

export interface Room {
  code: string;
  phase: RuinaPhase;
  round: number;
  points: { honestos: number; deshonestos: number };
  presidentIndex: number;
  vocalId: string | null;
  rejectionCount: number;
  hostId: string;
  players: RoomPlayer[];
  contractDeck: RuinaContract[];
  contract: RuinaContract;
  votes: Map<string, boolean>;
  voteResult: RuinaVoteResult | null;
  signatures: Map<string, "LIMPIO" | "SABOTAJE">;
  signedIds: string[];
  lastResult: RuinaRoundResult | null;
  winner: RuinaTeam | null;
  secrets: Map<string, RuinaSecret>;
  chat: RuinaChatMessage[];
  createdAt: number;
  lastActivityAt: number;
  phaseEndsAt: number | null;
}

export interface RuinaJoinResult {
  room: Room;
  player: RoomPlayer;
  token: string;
  reconnected: boolean;
}

function token(): string {
  return randomBytes(24).toString("base64url");
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function nextFloor(players: readonly RoomPlayer[]): RuinaFloor {
  const used = new Set(players.map((player) => player.piso));
  const free = RUINA_FLOORS.find((floor) => !used.has(floor));
  if (!free) throw new GameError("ROOM_FULL", "No quedan pisos libres.");
  return free;
}

export class RuinaStore {
  private readonly rooms = new Map<string, Room>();

  createRoom(nombre: string): { room: Room; player: RoomPlayer; token: string } {
    const code = this.generateCode();
    const now = Date.now();
    const host: RoomPlayer = {
      id: randomUUID(),
      nombre,
      piso: RUINA_FLOORS[0] ?? "Bajo",
      team: null,
      isHost: true,
      isAi: false,
      token: token(),
      connected: true,
      joinedAt: now,
    };
    const deck = shuffle(RUINA_CONTRACTS);
    const room: Room = {
      code,
      phase: "LOBBY",
      round: 0,
      points: { honestos: 0, deshonestos: 0 },
      presidentIndex: 0,
      vocalId: null,
      rejectionCount: 0,
      hostId: host.id,
      players: [host],
      contractDeck: deck,
      contract: deck[0] ?? RUINA_CONTRACTS[0]!,
      votes: new Map(),
      voteResult: null,
      signatures: new Map(),
      signedIds: [],
      lastResult: null,
      winner: null,
      secrets: new Map(),
      chat: [],
      createdAt: now,
      lastActivityAt: now,
      phaseEndsAt: null,
    };
    this.rooms.set(code, room);
    console.log(`[ruina] Sala ${code} creada por ${nombre}`);
    return { room, player: host, token: host.token };
  }

  joinRoom(input: {
    code: string;
    nombre: string;
    playerId?: string | undefined;
    token?: string | undefined;
  }): RuinaJoinResult {
    const room = this.getRoomOrThrow(input.code);
    room.lastActivityAt = Date.now();

    if (input.playerId) {
      const existing = room.players.find((player) => player.id === input.playerId);
      if (existing) {
        if (!input.token || existing.token !== input.token) {
          throw new GameError("UNAUTHORIZED", "No se pudo validar tu sesión.");
        }
        existing.connected = true;
        console.log(`[ruina] ${existing.nombre} se reconectó a ${room.code}`);
        return { room, player: existing, token: existing.token, reconnected: true };
      }
    }

    const byName = room.players.find(
      (player) => normalizeName(player.nombre) === normalizeName(input.nombre),
    );
    if (byName) {
      if (byName.connected) {
        throw new GameError("NAME_TAKEN", "Ya hay alguien con ese nombre en la sala.");
      }
      byName.connected = true;
      byName.token = token();
      console.log(`[ruina] ${byName.nombre} recuperó su asiento en ${room.code}`);
      return { room, player: byName, token: byName.token, reconnected: true };
    }

    if (room.phase !== "LOBBY") {
      throw new GameError("GAME_STARTED", "La partida ya ha empezado.");
    }
    if (room.players.length >= RUINA_MAX_PLAYERS) {
      throw new GameError("ROOM_FULL", `La sala está llena (máximo ${RUINA_MAX_PLAYERS}).`);
    }
    const player: RoomPlayer = {
      id: randomUUID(),
      nombre: input.nombre,
      piso: nextFloor(room.players),
      team: null,
      isHost: false,
      isAi: false,
      token: token(),
      connected: true,
      joinedAt: Date.now(),
    };
    room.players.push(player);
    room.lastActivityAt = Date.now();
    console.log(`[ruina] ${player.nombre} entró en ${room.code} (${player.piso})`);
    return { room, player, token: player.token, reconnected: false };
  }

  addAi(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede añadir IAs.");
    }
    if (room.phase !== "LOBBY") {
      throw new GameError("GAME_STARTED", "Solo se pueden añadir IAs en el lobby.");
    }
    if (room.players.length >= RUINA_MAX_PLAYERS) {
      throw new GameError("ROOM_FULL", `La sala está llena (máximo ${RUINA_MAX_PLAYERS}).`);
    }
    const aiCount = room.players.filter((player) => player.isAi).length;
    if (aiCount >= RUINA_MAX_AI) {
      throw new GameError("INVALID_COMPOSITION", `Máximo ${RUINA_MAX_AI} IAs por sala.`);
    }

    const usedNames = new Set(room.players.map((player) => normalizeName(player.nombre)));
    const name =
      RUINA_AI_NAMES.find((candidate) => !usedNames.has(normalizeName(candidate))) ??
      `IA ${aiCount + 1}`;
    const ai: RoomPlayer = {
      id: randomUUID(),
      nombre: name,
      piso: nextFloor(room.players),
      team: null,
      isHost: false,
      isAi: true,
      token: token(),
      connected: true,
      joinedAt: Date.now(),
    };
    room.players.push(ai);
    room.lastActivityAt = Date.now();
    console.log(`[ruina] ${name} (IA) se sentó en ${room.code} (${ai.piso})`);
    return room;
  }

  removeAi(code: string, requesterId: string, playerId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede quitar IAs.");
    }
    if (room.phase !== "LOBBY") {
      throw new GameError("GAME_STARTED", "Solo se pueden quitar IAs en el lobby.");
    }
    const ai = room.players.find((player) => player.id === playerId);
    if (!ai || !ai.isAi) {
      throw new GameError("INVALID_COMPOSITION", "Ese asiento no es una IA.");
    }
    room.players = room.players.filter((player) => player.id !== playerId);
    room.lastActivityAt = Date.now();
    console.log(`[ruina] ${ai.nombre} (IA) se marchó de ${room.code}`);
    return room;
  }

  startGame(code: string, requesterId: string, rng: () => number = Math.random): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) throw new GameError("NOT_HOST", "Solo el anfitrión puede empezar.");
    if (room.phase !== "LOBBY") throw new GameError("NOT_IN_LOBBY", "La partida ya ha empezado.");
    if (room.players.length < RUINA_MIN_PLAYERS) {
      throw new GameError(
        "INVALID_COMPOSITION",
        `Se necesitan al menos ${RUINA_MIN_PLAYERS} jugadores.`,
      );
    }
    if (room.players.length > RUINA_MAX_PLAYERS) {
      throw new GameError(
        "INVALID_COMPOSITION",
        `El máximo es ${RUINA_MAX_PLAYERS} jugadores.`,
      );
    }

    const setup = iniciarPartida(
      room.players.map((player) => ({ id: player.id, nombre: player.nombre })),
      rng,
    );
    const setupById = new Map(setup.players.map((player) => [player.id, player]));
    for (const player of room.players) {
      const assigned = setupById.get(player.id);
      if (!assigned) throw new GameError("SERVER_ERROR", "No se pudo repartir el piso.");
      player.piso = assigned.piso;
      player.team = assigned.equipo;
    }
    room.contractDeck = setup.contracts;
    room.secrets = new Map(Object.entries(setup.secrets));

    room.phase = "NOMINACION";
    room.round = 1;
    room.points = { honestos: 0, deshonestos: 0 };
    room.presidentIndex = setup.presidentIndex;
    room.vocalId = null;
    room.rejectionCount = 0;
    room.votes.clear();
    room.voteResult = null;
    room.signatures.clear();
    room.signedIds = [];
    room.lastResult = null;
    room.winner = null;
    room.contract = room.contractDeck[0] ?? RUINA_CONTRACTS[0]!;
    room.phaseEndsAt = Date.now() + NOMINATION_MS;
    room.lastActivityAt = Date.now();

    const split = ruinaTeamSplit(room.players.length);
    console.log(
      `[ruina] Sala ${code} empieza: ${split.honestos} honestos / ${split.deshonestos} deshonestos. ` +
        `Presidente: ${room.players[room.presidentIndex]?.nombre ?? "?"}`,
    );
    return room;
  }

  nominate(code: string, requesterId: string, vocalId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (room.phase !== "NOMINACION") {
      throw new GameError("NOT_IN_PHASE", "No toca nominar.");
    }
    if (this.president(room)?.id !== requester.id) {
      throw new GameError("NOT_PRESIDENT", "Solo el presidente puede nominar.");
    }
    if (vocalId === requester.id) {
      throw new GameError("INVALID_NOMINATION", "No puedes nominarte a ti mismo.");
    }
    const vocal = room.players.find((player) => player.id === vocalId);
    if (!vocal) throw new GameError("INVALID_NOMINATION", "Ese vecino no existe.");

    room.vocalId = vocal.id;
    room.phase = "VOTACION_COMISION";
    room.votes.clear();
    room.voteResult = null;
    room.phaseEndsAt = Date.now() + VOTE_MS;
    room.lastActivityAt = Date.now();
    console.log(
      `[ruina] ${room.code}: ${requester.nombre} nomina a ${vocal.nombre} para la comisión`,
    );
    return room;
  }

  voteCommission(code: string, playerId: string, approve: boolean): Room {
    const room = this.getRoomOrThrow(code);
    const player = this.requirePlayer(room, playerId);
    if (room.phase !== "VOTACION_COMISION") {
      throw new GameError("NOT_IN_PHASE", "No hay votación de comisión abierta.");
    }
    if (room.votes.has(player.id)) {
      throw new GameError("ALREADY_VOTED", "Ya has votado.");
    }
    room.votes.set(player.id, approve);
    room.lastActivityAt = Date.now();
    if (room.votes.size >= room.players.length) {
      this.resolveCommission(room);
    }
    return room;
  }

  signContract(code: string, playerId: string, choice: "LIMPIO" | "SABOTAJE"): Room {
    const room = this.getRoomOrThrow(code);
    const player = this.requirePlayer(room, playerId);
    if (room.phase !== "FIRMA_CONTRATO") {
      throw new GameError("NOT_IN_PHASE", "No hay contrato que firmar.");
    }
    if (room.presidentIndex < 0 || room.vocalId === null) {
      throw new GameError("NOT_IN_PHASE", "La comisión no está formada.");
    }
    const president = this.president(room);
    if (player.id !== president?.id && player.id !== room.vocalId) {
      throw new GameError("NOT_COMMISSION", "Solo el presidente y el vocal firman.");
    }
    if (room.signatures.has(player.id)) {
      throw new GameError("ALREADY_VOTED", "Ya has firmado.");
    }
    const finalChoice: "LIMPIO" | "SABOTAJE" =
      player.team === "DESHONESTOS" ? choice : "LIMPIO";
    room.signatures.set(player.id, finalChoice);
    room.signedIds = [...room.signatures.keys()];
    room.lastActivityAt = Date.now();
    if (room.signatures.size >= 2) {
      this.resolveContract(room);
    }
    return room;
  }

  /**
   * Botón de emergencia del anfitrión. No sustituye a los timers: sirve para
   * desatascar una demo si alguien se cuelga o cierra la pestaña.
   */
  forceAdvance(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede forzar el turno.");
    }

    switch (room.phase) {
      case "NOMINACION": {
        room.presidentIndex = (room.presidentIndex + 1) % room.players.length;
        room.vocalId = null;
        room.votes.clear();
        room.voteResult = null;
        room.phaseEndsAt = Date.now() + NOMINATION_MS;
        break;
      }
      case "VOTACION_COMISION": {
        for (const player of room.players) {
          if (!room.votes.has(player.id)) room.votes.set(player.id, false);
        }
        this.resolveCommission(room);
        break;
      }
      case "FIRMA_CONTRATO": {
        const president = this.president(room);
        for (const player of [president, room.players.find((item) => item.id === room.vocalId)]) {
          if (player && !room.signatures.has(player.id)) {
            room.signatures.set(player.id, "LIMPIO");
          }
        }
        room.signedIds = [...room.signatures.keys()];
        this.resolveContract(room);
        break;
      }
      case "RESOLUCION_RONDA": {
        this.advanceRound(room);
        break;
      }
      default:
        throw new GameError("NOT_IN_PHASE", "No hay una fase que forzar.");
    }

    room.lastActivityAt = Date.now();
    console.log(`[ruina] ${room.code}: ${requester.nombre} forzó el avance de fase`);
    return room;
  }

  /** Vuelve al lobby conservando asientos e IAs para una revancha. */
  returnToLobby(code: string, requesterId: string): Room {
    const room = this.getRoomOrThrow(code);
    const requester = this.requirePlayer(room, requesterId);
    if (!requester.isHost) {
      throw new GameError("NOT_HOST", "Solo el anfitrión puede abrir una revancha.");
    }
    if (room.phase !== "VICTORIA") {
      throw new GameError("NOT_IN_PHASE", "La revancha solo se abre al terminar la partida.");
    }

    room.phase = "LOBBY";
    room.round = 0;
    room.points = { honestos: 0, deshonestos: 0 };
    room.presidentIndex = 0;
    room.vocalId = null;
    room.rejectionCount = 0;
    room.votes.clear();
    room.voteResult = null;
    room.signatures.clear();
    room.signedIds = [];
    room.lastResult = null;
    room.winner = null;
    room.secrets.clear();
    room.contractDeck = shuffle(RUINA_CONTRACTS);
    room.contract = room.contractDeck[0] ?? RUINA_CONTRACTS[0]!;
    room.phaseEndsAt = null;
    for (const player of room.players) player.team = null;
    room.lastActivityAt = Date.now();
    console.log(`[ruina] ${room.code}: ${requester.nombre} abrió una revancha`);
    return room;
  }

  chat(code: string, playerId: string, text: string): RuinaChatMessage {
    const room = this.getRoomOrThrow(code);
    const player = this.requirePlayer(room, playerId);
    const message: RuinaChatMessage = {
      id: randomUUID(),
      at: Date.now(),
      playerId: player.id,
      nombre: player.nombre,
      texto: text.trim(),
    };
    room.chat.push(message);
    if (room.chat.length > 100) room.chat.splice(0, room.chat.length - 100);
    room.lastActivityAt = Date.now();
    return message;
  }

  disconnect(code: string, playerId: string): boolean {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) return false;
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return false;
    player.connected = false;
    room.lastActivityAt = Date.now();
    return true;
  }

  tick(now = Date.now()): string[] {
    const changed: string[] = [];
    for (const room of this.rooms.values()) {
      if (room.phase === "NOMINACION" && room.phaseEndsAt !== null && now >= room.phaseEndsAt) {
        this.autoNominate(room, now);
        changed.push(room.code);
        continue;
      }
      if (room.phase === "VOTACION_COMISION" && room.phaseEndsAt !== null && now >= room.phaseEndsAt) {
        for (const player of room.players) {
          if (!room.votes.has(player.id)) room.votes.set(player.id, false);
        }
        this.resolveCommission(room);
        changed.push(room.code);
        continue;
      }
      if (room.phase === "FIRMA_CONTRATO" && room.phaseEndsAt !== null && now >= room.phaseEndsAt) {
        const president = this.president(room);
        for (const player of [president, room.players.find((item) => item.id === room.vocalId)]) {
          if (!player) continue;
          if (!room.signatures.has(player.id)) {
            room.signatures.set(player.id, "LIMPIO");
          }
        }
        room.signedIds = [...room.signatures.keys()];
        this.resolveContract(room);
        changed.push(room.code);
        continue;
      }
      if (room.phase === "RESOLUCION_RONDA" && room.phaseEndsAt !== null && now >= room.phaseEndsAt) {
        this.advanceRound(room);
        changed.push(room.code);
        continue;
      }
      if (this.runAiActions(room)) {
        changed.push(room.code);
      }
    }
    return changed;
  }

  getPublicState(room: Room): RuinaState {
    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      points: { ...room.points },
      presidentId: this.president(room)?.id ?? "",
      vocalId: room.vocalId,
      rejectionCount: room.rejectionCount,
      players: room.players.map((player) => ({
        id: player.id,
        nombre: player.nombre,
        piso: player.piso,
        isHost: player.isHost,
        isAi: player.isAi,
        connected: player.connected,
      })),
      contract: room.contract,
      votes: room.voteResult?.votos ?? null,
      votedIds: [...room.votes.keys()],
      voteResult: room.voteResult,
      signedIds: [...room.signedIds],
      lastResult: room.lastResult,
      winner: room.winner,
      hostId: room.hostId,
      chat: [...room.chat],
      createdAt: room.createdAt,
      phaseEndsAt: room.phaseEndsAt,
    };
  }

  getPrivateInfo(room: Room, playerId: string): RuinaPrivateInfo | null {
    const player = room.players.find((item) => item.id === playerId);
    if (!player || !player.team || room.phase === "LOBBY") return null;
    const secret = room.secrets.get(player.id);
    if (!secret) return null;
    const companeros =
      player.team === "DESHONESTOS"
        ? room.players
            .filter((item) => item.team === "DESHONESTOS" && item.id !== player.id)
            .map((item) => ({ id: item.id, nombre: item.nombre, piso: item.piso }))
        : [];
    return { equipo: player.team, companeros, secreto: secret };
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(normalizeCode(code)) ?? null;
  }

  getRoomOrThrow(code: string): Room {
    const room = this.getRoom(code);
    if (!room) throw new GameError("ROOM_NOT_FOUND", "No existe ninguna sala con ese código.");
    return room;
  }

  authenticate(code: string, playerId: string, tokenValue: string): RoomPlayer {
    const room = this.getRoomOrThrow(code);
    const player = room.players.find((item) => item.id === playerId);
    if (!player) throw new GameError("UNAUTHORIZED", "Jugador no encontrado.");
    if (player.token !== tokenValue) throw new GameError("UNAUTHORIZED", "Sesión no válida.");
    return player;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  cleanupStaleRooms(now = Date.now()): number {
    let removed = 0;
    for (const [code, room] of this.rooms) {
      const hasConnectedHuman = room.players.some(
        (player) => player.connected && !player.isAi,
      );
      if (!hasConnectedHuman && now - room.lastActivityAt > 2 * 60 * 60 * 1000) {
        this.rooms.delete(code);
        removed += 1;
      }
    }
    return removed;
  }

  private requirePlayer(room: Room, playerId: string): RoomPlayer {
    const player = room.players.find((item) => item.id === playerId);
    if (!player) throw new GameError("UNAUTHORIZED", "No estás en esta sala.");
    return player;
  }

  private president(room: Room): RoomPlayer | null {
    return room.players[room.presidentIndex] ?? null;
  }

  /** Si el presidente no nomina en 60 s, el servidor elige un vocal al azar. */
  private autoNominate(room: Room, now: number): void {
    const president = this.president(room);
    if (!president) return;
    const eligible = room.players.filter(
      (player) => player.id !== president.id && player.connected,
    );
    const fallback = room.players.filter((player) => player.id !== president.id);
    const pool = eligible.length > 0 ? eligible : fallback;
    if (pool.length === 0) {
      room.presidentIndex = (room.presidentIndex + 1) % room.players.length;
      room.phaseEndsAt = now + NOMINATION_MS;
      return;
    }
    const vocal = pool[randomInt(0, pool.length)]!;
    room.vocalId = vocal.id;
    room.phase = "VOTACION_COMISION";
    room.votes.clear();
    room.voteResult = null;
    room.phaseEndsAt = now + VOTE_MS;
    room.lastActivityAt = now;
    console.log(
      `[ruina] ${room.code}: nominación automática de ${vocal.nombre} (presidente ${president.nombre} no nominó)`,
    );
  }

  /**
   * Las IAs juegan una acción por tick. Así la UI tiene tiempo de pintar el
   * cambio de fase y el humano sigue viendo lo que ocurre.
   */
  private runAiActions(room: Room): boolean {
    if (room.phase === "NOMINACION") {
      const president = this.president(room);
      if (!president?.isAi) return false;
      const candidates = room.players.filter((player) => player.id !== president.id);
      if (candidates.length === 0) return false;
      const vocal = candidates[randomInt(0, candidates.length)]!;
      this.nominate(room.code, president.id, vocal.id);
      return true;
    }

    if (room.phase === "VOTACION_COMISION") {
      const ais = room.players.filter(
        (player) => player.isAi && !room.votes.has(player.id),
      );
      if (ais.length === 0) return false;
      for (const ai of ais) {
        if (room.phase !== "VOTACION_COMISION") break;
        const approveChance = ai.team === "DESHONESTOS" ? 0.68 : 0.55;
        this.voteCommission(room.code, ai.id, Math.random() < approveChance);
      }
      return true;
    }

    if (room.phase === "FIRMA_CONTRATO") {
      const president = this.president(room);
      const vocal = room.players.find((player) => player.id === room.vocalId);
      const commission = [president, vocal].filter(
        (player): player is RoomPlayer =>
          Boolean(player?.isAi && !room.signatures.has(player.id)),
      );
      if (commission.length === 0) return false;
      for (const ai of commission) {
        if (room.phase !== "FIRMA_CONTRATO") break;
        const sabotage = ai.team === "DESHONESTOS" && Math.random() < 0.55;
        this.signContract(room.code, ai.id, sabotage ? "SABOTAJE" : "LIMPIO");
      }
      return true;
    }

    return false;
  }

  private resolveCommission(room: Room): void {
    const si = [...room.votes.values()].filter(Boolean).length;
    const no = room.votes.size - si;
    // Mayoría simple estricta: 3-3, 4-4 o cualquier empate se rechaza.
    const aprobada = si > no;
    const votos = Object.fromEntries(room.votes.entries());
    room.voteResult = { aprobada, si, no, votos };

    if (aprobada) {
      room.rejectionCount = 0;
      room.phase = "FIRMA_CONTRATO";
      room.signatures.clear();
      room.signedIds = [];
      room.phaseEndsAt = Date.now() + SIGN_MS;
      console.log(`[ruina] ${room.code}: comisión aprobada (${si}-${no})`);
      return;
    }

    room.rejectionCount += 1;
    console.log(
      `[ruina] ${room.code}: comisión rechazada (${si}-${no}), rechazo ${room.rejectionCount}/${RUINA_MAX_REJECTIONS}`,
    );
    if (room.rejectionCount >= RUINA_MAX_REJECTIONS) {
      this.awardPoint(room, "DESHONESTOS", "DERRUMBE_CONSTRUCTORA", 0);
      return;
    }
    room.presidentIndex = (room.presidentIndex + 1) % room.players.length;
    room.vocalId = null;
    room.phase = "NOMINACION";
    room.phaseEndsAt = Date.now() + NOMINATION_MS;
    // Se conserva voteResult para que la sala vea los votos públicos del rechazo.
  }

  private resolveContract(room: Room): void {
    const sabotajes = [...room.signatures.values()].filter((value) => value === "SABOTAJE").length;
    this.awardPoint(
      room,
      sabotajes > 0 ? "DESHONESTOS" : "HONESTOS",
      sabotajes > 0 ? "SABOTAJE" : "OBRA_LIMPIA",
      sabotajes,
    );
  }

  private awardPoint(
    room: Room,
    team: RuinaTeam,
    reason: RuinaRoundReason,
    sabotajes: number,
  ): void {
    if (team === "HONESTOS") room.points.honestos += 1;
    else room.points.deshonestos += 1;
    room.lastResult = {
      saboteada: sabotajes > 0,
      sabotajes,
      ganador: team,
      motivo: reason,
    };
    room.phase = "RESOLUCION_RONDA";
    room.phaseEndsAt = Date.now() + RESOLUTION_MS;
    if (room.points.honestos >= 2 || room.points.deshonestos >= 2) {
      room.winner = room.points.honestos >= 2 ? "HONESTOS" : "DESHONESTOS";
    }
    console.log(
      `[ruina] ${room.code}: punto para ${team} (${reason}). ` +
        `${room.points.honestos}-${room.points.deshonestos}`,
    );
  }

  private advanceRound(room: Room): void {
    if (room.winner) {
      room.phase = "VICTORIA";
      room.phaseEndsAt = null;
      room.lastActivityAt = Date.now();
      console.log(`[ruina] ${room.code}: victoria ${room.winner}`);
      return;
    }
    if (room.round >= 3) {
      room.winner =
        room.points.honestos >= room.points.deshonestos ? "HONESTOS" : "DESHONESTOS";
      room.phase = "VICTORIA";
      room.phaseEndsAt = null;
      return;
    }

    room.round += 1;
    room.phase = "NOMINACION";
    room.presidentIndex = (room.presidentIndex + 1) % room.players.length;
    room.vocalId = null;
    room.rejectionCount = 0;
    room.votes.clear();
    room.voteResult = null;
    room.signatures.clear();
    room.signedIds = [];
    room.lastResult = null;
    room.phaseEndsAt = Date.now() + NOMINATION_MS;
    room.contract =
      room.contractDeck[room.round - 1] ??
      shuffle(RUINA_CONTRACTS)[0] ??
      RUINA_CONTRACTS[0]!;
    room.lastActivityAt = Date.now();
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = "";
      for (let i = 0; i < 4; i += 1) {
        code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError("SERVER_ERROR", "No se pudo generar un código de sala.");
  }
}
