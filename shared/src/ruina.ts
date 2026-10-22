import { z } from "zod";

export const RUINA_MIN_PLAYERS = 5;
export const RUINA_MAX_PLAYERS = 8;
export const RUINA_MAX_AI = 4;

export const RUINA_AI_NAMES = [
  "Manoli",
  "Paco",
  "Carmen",
  "Antonio",
  "Paqui",
  "Fermín",
  "Rosario",
  "Nicolás",
] as const;

export const RUINA_FLOORS = [
  "Bajo",
  "1ºA",
  "1ºB",
  "2ºA",
  "2ºB",
  "3ºA",
  "3ºB",
  "Ático",
] as const;

export type RuinaFloor = (typeof RUINA_FLOORS)[number];

export type RuinaTeam = "HONESTOS" | "DESHONESTOS";

export type RuinaPhase =
  | "LOBBY"
  | "NOMINACION"
  | "VOTACION_COMISION"
  | "FIRMA_CONTRATO"
  | "RESOLUCION_RONDA"
  | "VICTORIA";

export type RuinaSecretType = "SOSPECHOSO" | "LIMPIO" | "TRAPO_SUCIO";

export interface RuinaSecret {
  sobrePiso: RuinaFloor;
  tipo: RuinaSecretType;
  texto: string;
}

export interface RuinaPlayerPublic {
  id: string;
  nombre: string;
  piso: RuinaFloor;
  isHost: boolean;
  isAi: boolean;
  connected: boolean;
}

export interface RuinaPrivateInfo {
  equipo: RuinaTeam;
  companeros: Array<{ id: string; nombre: string; piso: RuinaFloor }>;
  secreto: RuinaSecret;
}

export interface RuinaContract {
  id: string;
  titulo: string;
  descripcion: string;
}

export interface RuinaChatMessage {
  id: string;
  at: number;
  playerId: string;
  nombre: string;
  texto: string;
}

export interface RuinaVoteResult {
  aprobada: boolean;
  si: number;
  no: number;
  /** Votos públicos una vez cerrada la votación. */
  votos: Record<string, boolean>;
}

export type RuinaRoundReason = "OBRA_LIMPIA" | "SABOTAJE" | "TRES_RECHAZOS";

export interface RuinaRoundResult {
  saboteada: boolean;
  sabotajes: number;
  ganador: RuinaTeam;
  motivo: RuinaRoundReason;
}

export interface RuinaState {
  code: string;
  phase: RuinaPhase;
  round: number;
  points: { honestos: number; deshonestos: number };
  presidentId: string;
  vocalId: string | null;
  rejectionCount: number;
  players: RuinaPlayerPublic[];
  contract: RuinaContract;
  /** null mientras la votación está abierta. */
  votes: Record<string, boolean> | null;
  votedIds: string[];
  voteResult: RuinaVoteResult | null;
  signedIds: string[];
  lastResult: RuinaRoundResult | null;
  winner: RuinaTeam | null;
  hostId: string;
  chat: RuinaChatMessage[];
  createdAt: number;
  /** Fin de la votación o de la pantalla de resolución, según la fase. */
  phaseEndsAt: number | null;
}

export const RUINA_CONTRACTS: RuinaContract[] = [
  {
    id: "ascensor",
    titulo: "Instalar un ascensor hidráulico",
    descripcion:
      "La empresa Obras Cumbre propone instalar un ascensor hidráulico en el hueco de la escalera. Presupuesto: 48.000 €.",
  },
  {
    id: "ventilacion",
    titulo: "Cambiar el sistema de ventilación del garaje",
    descripcion:
      "Renovar todos los conductos del garaje por un sistema de extracción de aire. Presupuesto: 18.000 €.",
  },
  {
    id: "portal",
    titulo: "Sustituir la puerta del portal",
    descripcion:
      "Cambiar la puerta de roble por una puerta automática con videoportero. Presupuesto: 12.500 €.",
  },
  {
    id: "iluminacion-garaje",
    titulo: "Renovar la iluminación del garaje",
    descripcion:
      "Sustituir las luces viejas por LEDs de bajo consumo y sensores de movimiento. Presupuesto: 2.900 €.",
  },
  {
    id: "fachada",
    titulo: "Reformar la fachada y la cornisa",
    descripcion:
      "Reparar la cornisa y pintar la fachada antes de que caiga algún trozo. Presupuesto: 26.000 €.",
  },
  {
    id: "azotea",
    titulo: "Impermeabilizar la azotea",
    descripcion:
      "Aplicar una capa de impermeabilización y revisar los sumideros. Presupuesto: 9.800 €.",
  },
  {
    id: "electricidad",
    titulo: "Renovar la instalación eléctrica",
    descripcion:
      "Sustituir el cuadro general y el cableado del portal. Presupuesto: 15.400 €.",
  },
  {
    id: "placas",
    titulo: "Instalar placas solares",
    descripcion:
      "Colocar placas fotovoltaicas en la azotea para reducir la factura común. Presupuesto: 32.000 €.",
  },
];

export const RUINA_TEAM_SPLITS: Record<number, { honestos: number; deshonestos: number }> = {
  5: { honestos: 3, deshonestos: 2 },
  6: { honestos: 4, deshonestos: 2 },
  7: { honestos: 5, deshonestos: 2 },
  8: { honestos: 5, deshonestos: 3 },
};

export function ruinaTeamSplit(playerCount: number): { honestos: number; deshonestos: number } {
  const split = RUINA_TEAM_SPLITS[playerCount];
  if (!split) {
    throw new Error(`Número de jugadores no soportado: ${playerCount}`);
  }
  return split;
}

export interface RuinaSetupInput {
  id: string;
  nombre: string;
}

export interface RuinaSetupPlayer extends RuinaSetupInput {
  piso: RuinaFloor;
  equipo: RuinaTeam;
  /** Alias explícito del modelo de datos: true para comerciales encubiertos. */
  esDeshonesto: boolean;
  /** Expediente sobre el vecino de la derecha. */
  informacionPrivada: RuinaSecret;
}

export interface RuinaSetupResult {
  /** Mismo orden que la entrada: el vecino de la derecha es el siguiente del array. */
  players: RuinaSetupPlayer[];
  secrets: Record<string, RuinaSecret>;
  contracts: RuinaContract[];
  presidentIndex: number;
}

function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = copy[index];
    const other = copy[swapIndex];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swapIndex] = current;
  }
  return copy;
}

/**
 * Lógica pura de arranque: asigna pisos, reparte bandos y crea la cadena
 * circular de expedientes. No toca red, timers ni estado global.
 *
 * - 5–7 jugadores: 2 deshonestos.
 * - 8 jugadores: 3 deshonestos.
 */
export function iniciarPartida(
  jugadores: readonly RuinaSetupInput[],
  rng: () => number = Math.random,
): RuinaSetupResult {
  if (jugadores.length < RUINA_MIN_PLAYERS || jugadores.length > RUINA_MAX_PLAYERS) {
    throw new Error(`Se necesitan entre ${RUINA_MIN_PLAYERS} y ${RUINA_MAX_PLAYERS} jugadores.`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const player of jugadores) {
    if (!player.id.trim() || !player.nombre.trim()) {
      throw new Error("Todos los jugadores necesitan id y nombre.");
    }
    if (ids.has(player.id)) throw new Error(`Id repetido: ${player.id}`);
    const normalizedName = player.nombre.trim().toLocaleLowerCase("es");
    if (names.has(normalizedName)) throw new Error(`Nombre repetido: ${player.nombre}`);
    ids.add(player.id);
    names.add(normalizedName);
  }

  const split = ruinaTeamSplit(jugadores.length);
  const dishonestIndexes = new Set(
    seededShuffle(
      jugadores.map((_, index) => index),
      rng,
    ).slice(0, split.deshonestos),
  );

  const basePlayers = jugadores.map((player, index) => {
    const equipo: RuinaTeam = dishonestIndexes.has(index) ? "DESHONESTOS" : "HONESTOS";
    return {
      id: player.id,
      nombre: player.nombre.trim().replace(/\s+/g, " "),
      piso: RUINA_FLOORS[index]!,
      equipo,
      esDeshonesto: equipo === "DESHONESTOS",
    };
  });

  const secrets: Record<string, RuinaSecret> = {};
  const players: RuinaSetupPlayer[] = [];
  for (let index = 0; index < basePlayers.length; index += 1) {
    const player = basePlayers[index]!;
    const watched = basePlayers[(index + 1) % basePlayers.length]!;
    const tipo: RuinaSecretType =
      watched.equipo === "DESHONESTOS"
        ? "SOSPECHOSO"
        : rng() < 0.5
          ? "LIMPIO"
          : "TRAPO_SUCIO";
    const informacionPrivada: RuinaSecret = {
      sobrePiso: watched.piso,
      tipo,
      texto: secretText(tipo, watched.piso),
    };
    secrets[player.id] = informacionPrivada;
    players.push({ ...player, informacionPrivada });
  }

  return {
    players,
    secrets,
    contracts: seededShuffle(RUINA_CONTRACTS, rng),
    presidentIndex: 0,
  };
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(20, "El nombre no puede pasar de 20 caracteres")
  .transform((value) => value.replace(/\s+/g, " "));

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}$/, "El código debe tener 4 letras");

export const ruinaClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create_room"), nombre: nameSchema }),
  z.object({
    type: z.literal("join"),
    code: codeSchema,
    nombre: nameSchema,
    playerId: z.string().min(1).max(64).optional(),
    token: z.string().min(1).max(128).optional(),
  }),
  z.object({ type: z.literal("start_game") }),
  z.object({ type: z.literal("add_ai") }),
  z.object({ type: z.literal("remove_ai"), playerId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("force_advance") }),
  z.object({ type: z.literal("nominate"), vocalId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("vote_commission"), approve: z.boolean() }),
  z.object({ type: z.literal("sign_contract"), choice: z.enum(["LIMPIO", "SABOTAJE"]) }),
  z.object({
    type: z.literal("chat"),
    text: z.string().trim().min(1, "Mensaje vacío").max(280, "Máximo 280 caracteres"),
  }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("ping") }),
]);

export type RuinaClientMessage = z.infer<typeof ruinaClientMessageSchema>;

export type RuinaErrorCode =
  | "INVALID_MESSAGE"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "GAME_STARTED"
  | "NOT_HOST"
  | "NOT_IN_LOBBY"
  | "NOT_IN_PHASE"
  | "NOT_PRESIDENT"
  | "INVALID_NOMINATION"
  | "ALREADY_VOTED"
  | "NOT_COMMISSION"
  | "UNAUTHORIZED"
  | "INVALID_COMPOSITION"
  | "SERVER_ERROR";

export type RuinaServerMessage =
  | {
      type: "joined";
      state: RuinaState;
      you: { playerId: string; nombre: string; isHost: boolean };
      token: string;
      privateInfo: RuinaPrivateInfo | null;
    }
  | { type: "room_state"; state: RuinaState }
  | { type: "private_info"; privateInfo: RuinaPrivateInfo }
  | { type: "chat_message"; message: RuinaChatMessage }
  | { type: "error"; code: RuinaErrorCode; message: string }
  | { type: "notice"; message: string }
  | { type: "pong"; at: number };

export function secretText(
  tipo: RuinaSecretType,
  piso: RuinaFloor,
): string {
  switch (tipo) {
    case "SOSPECHOSO":
      return `Viste al ${piso} reunido en el portal con el comercial de ascensores.`;
    case "LIMPIO":
      return `El ${piso} rechazó una comisión ilegal el mes pasado; es de fiar.`;
    case "TRAPO_SUCIO":
      return `El ${piso} debe 6 meses de cuota y pone la música a las 3 AM. Parece un vecino problemático, no un comercial.`;
  }
}
