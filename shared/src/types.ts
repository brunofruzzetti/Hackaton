import type { PresidentStyleId, RoleId } from "./roles.js";

/** Fases de una ronda. El orden está fijado por el servidor. */
export type Phase = "LOBBY" | "ROLES" | "DISCUSSION" | "JUDGMENT" | "RESULTS_SHOP";

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

/** Perfil de voz que el cliente aplica con speechSynthesis. */
export interface VoiceProfile {
  /** Índice para elegir entre las voces disponibles del navegador. */
  voiceIndex: number;
  pitch: number;
  rate: number;
  volume: number;
  /** Etiqueta para depuración/UI (p. ej. "IA · Manoli"). */
  label: string;
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
