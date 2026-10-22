import type { CommunityEvent } from "./communityEvents.js";
import type { PresidentStyleId, RoleId } from "./roles.js";

/** Fases de una ronda. El orden está fijado por el servidor. */
export type Phase = "LOBBY" | "ROLES" | "DISCUSSION" | "JUDGMENT" | "RESULTS";

export type PlayerKind = "human" | "ai";

/** Datos públicos de un participante (nunca incluye tokens). */
export interface PlayerState {
  id: string;
  name: string;
  kind: PlayerKind;
  isHost: boolean;
  connected: boolean;
  roleId: RoleId | null;
  /** Hito 2/5: indicador de voz activa. */
  speaking: boolean;
  /** Hito 5: el juez ha silenciado a este jugador hasta este timestamp. */
  silencedUntil: number | null;
  /** Hito 5: avisos de orden acumulados en la ronda. */
  orderWarnings: number;
  /** Puntos acumulados por tareas y rol en las rondas juzgadas. */
  totalPoints: number;
  /** Puntos obtenidos en la última ronda juzgada. */
  lastRoundPoints: number | null;
}

export type TranscriptSource = "voice" | "chat" | "ai" | "system";

export interface TranscriptEntry {
  id: string;
  at: number;
  playerId: string | null;
  playerName: string;
  roleId: RoleId | null;
  text: string;
  source: TranscriptSource;
}

/** Estado completo que recibe el cliente. */
export interface RoomState {
  code: string;
  phase: Phase;
  round: number;
  proposal: string;
  hostId: string;
  players: PlayerState[];
  transcript: TranscriptEntry[];
  createdAt: number;
  discussionEndsAt: number | null;
  presidentStyleId: PresidentStyleId | null;
  /** Suceso comunitario activo (Hito 4). */
  currentEvent: CommunityEvent | null;
  /** Resultado de la última ronda juzgada. */
  latestResult: RoundResult | null;
  isGameOver: boolean;
  winnerId: string | null;
}

export interface TaskEvaluation {
  taskId: string;
  /** Texto de la tarea para mostrarla en el acta de resultados. */
  taskText: string;
  cumplida: boolean;
  evidencia: string;
}

export interface JudgeScores {
  fidelidad_cliche: number;
  participacion: number;
  creatividad: number;
  reaccion_a_otros: number;
}

export interface PlayerRoundResult {
  playerId: string;
  playerName: string;
  roleId: RoleId | null;
  tasks: TaskEvaluation[];
  /** Puntos de tareas conseguidos / posibles en la ronda. */
  taskPoints: number;
  taskPointsPossible: number;
  /** Bonus de interpretación 0-5 calculado desde las notas del juez. */
  roleBonus: number;
  /** Puntuación final de la ronda: taskPoints + roleBonus. */
  totalPoints: number;
  scores: JudgeScores;
  evidencia: string;
  comentarioGracioso: string;
  orderWarnings: number;
}

export interface RoundResult {
  round: number;
  judgedAt: number;
  players: PlayerRoundResult[];
}

/** Identidad del jugador que acaba de entrar. */
export interface SelfState {
  playerId: string;
  name: string;
  isHost: boolean;
}

/** Configuración pública que el cliente necesita (sin secretos). */
export interface PublicConfig {
  livekitConfigured: boolean;
  livekitUrl: string | null;
  sttProvider: string;
  aiProvider: string;
  judgeForceMute: boolean;
  maxParticipants: number;
  maxAiPlayers: number;
  minParticipants: number;
  discussionSeconds: number;
}

/** Respuesta del endpoint que emite tokens de LiveKit. */
export interface LivekitTokenResponse {
  url: string;
  token: string;
  roomName: string;
}

/** Respuesta del endpoint de transcripción. */
export interface SttResponse {
  text: string;
  provider: string;
  entry: TranscriptEntry;
}

/** Cuerpo estándar de error de la API HTTP. */
export interface ApiErrorBody {
  error: string;
  message: string;
}
