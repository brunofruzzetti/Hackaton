import { GAME_CONFIG } from "./config.js";
import {
  PRESIDENT_STYLE_IDS,
  ROLE_IDS,
  type PresidentStyleId,
  type RoleId,
} from "./roles.js";

export type Rng = () => number;

export interface ParticipantSeed {
  id: string;
  name: string;
  kind: "human" | "ai";
}

export interface RoleAssignment {
  playerId: string;
  roleId: RoleId;
}

export interface CompositionPlan {
  ok: boolean;
  errors: string[];
  /** Vecinos IA que se añadirán automáticamente al empezar para llegar al mínimo. */
  aiToAdd: number;
  finalHumans: number;
  finalAi: number;
  finalTotal: number;
}

/**
 * Planifica la composición de una partida.
 * - Mínimo 3 participantes totales; los IA rellenan hasta el mínimo.
 * - Al menos 1 humano.
 * - Máximo 4 IA y máximo 8 participantes.
 */
export function planComposition(input: { humans: number; ai: number }): CompositionPlan {
  const errors: string[] = [];
  const humans = Math.max(0, Math.floor(input.humans));
  const ai = Math.max(0, Math.floor(input.ai));
  const currentTotal = humans + ai;

  if (humans < 1) {
    errors.push("Se necesita al menos 1 jugador humano para empezar.");
  }
  if (ai > GAME_CONFIG.MAX_AI_PLAYERS) {
    errors.push(`Hay ${ai} vecinos IA y el máximo es ${GAME_CONFIG.MAX_AI_PLAYERS}.`);
  }
  if (currentTotal > GAME_CONFIG.MAX_PARTICIPANTS) {
    errors.push(`Hay ${currentTotal} participantes y el máximo es ${GAME_CONFIG.MAX_PARTICIPANTS}.`);
  }

  const missingForMinimum = Math.max(0, GAME_CONFIG.MIN_PARTICIPANTS - currentTotal);
  const aiCapacity = Math.max(0, GAME_CONFIG.MAX_AI_PLAYERS - ai);
  const aiToAdd = Math.min(missingForMinimum, aiCapacity);
  const finalAi = ai + aiToAdd;
  const finalHumans = humans;
  const finalTotal = finalHumans + finalAi;

  if (finalTotal < GAME_CONFIG.MIN_PARTICIPANTS) {
    errors.push(
      `No se llega al mínimo de ${GAME_CONFIG.MIN_PARTICIPANTS} participantes, ni siquiera con vecinos IA.`,
    );
  }
  if (finalTotal > GAME_CONFIG.MAX_PARTICIPANTS) {
    errors.push(`La partida quedaría con ${finalTotal} participantes (máximo ${GAME_CONFIG.MAX_PARTICIPANTS}).`);
  }
  if (finalAi > GAME_CONFIG.MAX_AI_PLAYERS) {
    errors.push(`Se superaría el máximo de ${GAME_CONFIG.MAX_AI_PLAYERS} vecinos IA.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    aiToAdd,
    finalHumans,
    finalAi,
    finalTotal,
  };
}

/** Barajado Fisher-Yates sin mutar el array original. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const current = copy[i];
    const other = copy[j];
    if (current === undefined || other === undefined) continue;
    copy[i] = other;
    copy[j] = current;
  }
  return copy;
}

function pickRandom<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error("pickRandom: lista vacía");
  }
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)));
  const item = items[index];
  if (item === undefined) {
    throw new Error("pickRandom: índice fuera de rango");
  }
  return item;
}

/** Elige al azar el estilo de presidencia de la partida. */
export function pickPresidentStyle(rng: Rng = Math.random): PresidentStyleId {
  return pickRandom(PRESIDENT_STYLE_IDS, rng);
}

/**
 * Aplica la REGLA DEL CONSERJE sobre un conjunto de roles ya sorteado.
 * Si está el conserje y no el presidente, sustituye otro rol aleatorio por el presidente.
 * Si no cabe (conjunto de tamaño 1), descarta el conserje y sortea otro rol distinto.
 */
export function ensureConciergePresident(roleIds: readonly RoleId[], rng: Rng = Math.random): RoleId[] {
  const result = [...roleIds];
  const hasConcierge = result.includes("concierge");
  const hasPresident = result.includes("president");

  if (!hasConcierge || hasPresident) {
    return result;
  }

  const replaceableIndexes = result
    .map((roleId, index) => ({ roleId, index }))
    .filter(({ roleId }) => roleId !== "concierge")
    .map(({ index }) => index);

  if (replaceableIndexes.length > 0) {
    const index = pickRandom(replaceableIndexes, rng);
    result[index] = "president";
    return result;
  }

  // Caso extremo: solo cabe el conserje. Se descarta y se sortea otro rol.
  const withoutConcierge: RoleId[] = result.filter((roleId) => roleId !== "concierge");
  const available: RoleId[] = ROLE_IDS.filter((roleId) => !withoutConcierge.includes(roleId));
  if (available.length > 0) {
    withoutConcierge.push(pickRandom(available, rng));
  }
  return withoutConcierge;
}

/**
 * Reparte roles aleatorios sin repetir entre los participantes, aplicando la regla
 * conserje ⇒ presidente. Devuelve una asignación por playerId.
 */
export function assignRoles(
  participants: readonly ParticipantSeed[],
  rng: Rng = Math.random,
): RoleAssignment[] {
  if (participants.length > ROLE_IDS.length) {
    throw new Error(
      `No se pueden repartir ${participants.length} roles: solo hay ${ROLE_IDS.length}.`,
    );
  }
  if (participants.length === 0) {
    return [];
  }

  const drawn = shuffle(ROLE_IDS, rng).slice(0, participants.length);
  const corrected = ensureConciergePresident(drawn, rng);
  const shuffledParticipants = shuffle(participants, rng);

  return shuffledParticipants.map((participant, index) => {
    const roleId = corrected[index];
    if (!roleId) {
      throw new Error("assignRoles: falta un rol para un participante.");
    }
    return { playerId: participant.id, roleId };
  });
}
