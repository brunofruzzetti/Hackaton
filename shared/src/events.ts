import { z } from "zod";
import type { PlayerState, RoomState, SelfState, TranscriptEntry } from "./types.js";

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(20, "El nombre no puede pasar de 20 caracteres")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "El nombre contiene caracteres no válidos")
  .transform((value) => value.replace(/\s+/g, " "));

const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}$/, "El código debe tener 4 letras");

/** Mensajes que el cliente puede enviar al servidor. Todos se validan con zod. */
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_room"),
    name: displayNameSchema,
  }),
  z.object({
    type: z.literal("join"),
    code: roomCodeSchema,
    name: displayNameSchema,
    playerId: z.string().min(1).max(64).optional(),
    token: z.string().min(1).max(128).optional(),
  }),
  z.object({ type: z.literal("add_ai") }),
  z.object({ type: z.literal("remove_ai"), playerId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("start_game") }),
  z.object({
    type: z.literal("chat"),
    text: z.string().trim().min(1, "Mensaje vacío").max(280, "Máximo 280 caracteres"),
  }),
  z.object({ type: z.literal("speaker_state"), speaking: z.boolean() }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerErrorCode =
  | "INVALID_MESSAGE"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "GAME_STARTED"
  | "NOT_HOST"
  | "NOT_IN_LOBBY"
  | "INVALID_COMPOSITION"
  | "AI_LIMIT"
  | "PLAYER_NOT_FOUND"
  | "UNAUTHORIZED"
  | "STT_ERROR"
  | "SERVER_ERROR";

/** Mensajes que el servidor envía al cliente. */
export type ServerMessage =
  | {
      type: "joined";
      state: RoomState;
      you: SelfState;
      token: string;
    }
  | { type: "room_state"; state: RoomState }
  | { type: "transcript_append"; entry: TranscriptEntry }
  | { type: "error"; code: ServerErrorCode; message: string }
  | { type: "notice"; message: string }
  | { type: "pong"; at: number };

/** Entrada de transcripción con el formato compartido [jugador | rol | texto]. */
export function formatTranscriptLabel(entry: TranscriptEntry, roleName: string | null): string {
  return `[${entry.playerName} | ${roleName ?? "Vecino"}]`;
}

/** ¿Este estado permite empezar? Se usa en lobby y servidor con la misma lógica. */
export function humanPlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.filter((player) => player.kind === "human");
}

export function aiPlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.filter((player) => player.kind === "ai");
}
