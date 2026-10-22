import Fastify, { type FastifyReply } from "fastify";
import { z } from "zod";
import {
  AUDIO_CONFIG,
  GAME_CONFIG,
  JUDGE_CONFIG,
  type PublicConfig,
  type SttResponse,
} from "@shared/index";
import { createLlmService } from "./ai/llm.js";
import { AiDirector } from "./ai/director.js";
import { env, livekitConfigured, logEnvSummary } from "./env.js";
import { GameError } from "./errors.js";
import { JudgeModerator } from "./judgeModerator.js";
import { JudgeOrchestrator } from "./judge/orchestrator.js";
import { createLivekitToken, getLivekitConfigFromEnv } from "./livekit.js";
import { RoomStore, type RoomPlayer } from "./roomStore.js";
import { createSttProvider, SttError, transcribeWithRetry } from "./stt/index.js";
import { WsHub } from "./wsHub.js";

const app = Fastify({ logger: true });
const store = new RoomStore();
const hub = new WsHub(app.server, store);
const llm = createLlmService();
const aiDirector = new AiDirector(store, hub, llm);
aiDirector.start();
const judgeModerator = new JudgeModerator(store, hub, env.JUDGE_FORCE_MUTE);
judgeModerator.start();
const judgeOrchestrator = new JudgeOrchestrator(store, hub);
judgeOrchestrator.start();
const sttProvider = createSttProvider(env.STT_PROVIDER, {
  openai: env.OPENAI_API_KEY,
  deepgram: env.DEEPGRAM_API_KEY,
});

const publicConfig: PublicConfig = {
  livekitConfigured,
  livekitUrl: livekitConfigured ? (env.LIVEKIT_URL ?? null) : null,
  sttProvider: env.STT_PROVIDER,
  aiProvider: llm.name,
  judgeForceMute: env.JUDGE_FORCE_MUTE,
  maxParticipants: GAME_CONFIG.MAX_PARTICIPANTS,
  maxAiPlayers: GAME_CONFIG.MAX_AI_PLAYERS,
  minParticipants: GAME_CONFIG.MIN_PARTICIPANTS,
  discussionSeconds: GAME_CONFIG.DISCUSSION_SECONDS,
};

function apiError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
): FastifyReply {
  return reply.code(status).send({ error: code, message });
}

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{4}$/);
const playerIdSchema = z.string().min(1).max(64);
const sessionTokenSchema = z.string().min(1).max(128);

app.get("/api/health", async () => ({
  ok: true,
  service: "junta-de-vecinos",
  livekitConfigured,
  sttProvider: sttProvider.name,
  rooms: store.roomCount,
}));

app.get("/api/config", async () => publicConfig);

app.get("/api/debug/room/:code", async (request, reply) => {
  const params = request.params as { code?: string };
  const code = (params.code ?? "").toUpperCase();
  try {
    return store.getPublicState(store.getRoomOrThrow(code));
  } catch {
    return reply.code(404).send({ error: "ROOM_NOT_FOUND" });
  }
});

// --- LiveKit: token de acceso a la sala de audio ---

const livekitTokenBodySchema = z.object({
  code: codeSchema,
  playerId: playerIdSchema,
  sessionToken: sessionTokenSchema,
});

app.post("/api/livekit/token", async (request, reply) => {
  const parsed = livekitTokenBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return apiError(reply, 400, "INVALID_REQUEST", "Faltan datos para el token de audio.");
  }

  const config = getLivekitConfigFromEnv();
  if (!config) {
    return apiError(
      reply,
      503,
      "LIVEKIT_NOT_CONFIGURED",
      "El audio no está configurado en el servidor. Define LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET.",
    );
  }

  try {
    const player = store.authenticate(
      parsed.data.code,
      parsed.data.playerId,
      parsed.data.sessionToken,
    );
    const result = await createLivekitToken({
      code: parsed.data.code,
      playerId: player.id,
      playerName: player.name,
      roleId: player.roleId,
      config,
    });
    console.log(`[livekit] Token emitido para ${player.name} en ${result.roomName}`);
    return result;
  } catch (error: unknown) {
    if (error instanceof GameError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : 404;
      return apiError(reply, status, error.code, error.message);
    }
    console.error("[livekit] Error generando el token:", error);
    return apiError(reply, 500, "SERVER_ERROR", "No se pudo generar el token de audio.");
  }
});

// --- STT: subida binaria de un clip y transcripción compartida ---

app.addContentTypeParser(
  "application/octet-stream",
  { parseAs: "buffer", bodyLimit: AUDIO_CONFIG.MAX_CLIP_BYTES + 4096 },
  (_request, body, done) => {
    done(null, body);
  },
);

const sttHeadersSchema = z.object({
  code: codeSchema,
  playerId: playerIdSchema,
  sessionToken: sessionTokenSchema,
  mimeType: z.string().min(1).max(120),
});

const AUDIO_MIME_PATTERN = /^audio\/[a-z0-9.+-]+(?:;\s*codecs=[a-z0-9.," -]+)?$/i;

app.post(
  "/api/stt",
  { bodyLimit: AUDIO_CONFIG.MAX_CLIP_BYTES + 4096 },
  async (request, reply) => {
    const parsedHeaders = sttHeadersSchema.safeParse({
      code: request.headers["x-room-code"],
      playerId: request.headers["x-player-id"],
      sessionToken: request.headers["x-session-token"],
      mimeType: request.headers["x-audio-mime"] ?? "audio/webm",
    });

    if (!parsedHeaders.success) {
      return apiError(
        reply,
        400,
        "INVALID_REQUEST",
        "Faltan las cabeceras de sesión o el tipo de audio.",
      );
    }

    const { code, playerId, sessionToken, mimeType } = parsedHeaders.data;
    if (!AUDIO_MIME_PATTERN.test(mimeType)) {
      return apiError(reply, 415, "INVALID_AUDIO", "Formato de audio no admitido.");
    }

    const body: unknown = request.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return apiError(reply, 400, "INVALID_AUDIO", "El clip de audio está vacío.");
    }

    let player: RoomPlayer;
    try {
      player = store.authenticate(code, playerId, sessionToken);
    } catch (error: unknown) {
      if (error instanceof GameError) {
        const status = error.code === "UNAUTHORIZED" ? 401 : 404;
        return apiError(reply, status, error.code, error.message);
      }
      throw error;
    }

    try {
      const text = await transcribeWithRetry(sttProvider, body, {
        mimeType,
        language: "es",
      });

      if (!text) {
        return apiError(
          reply,
          422,
          "EMPTY_TRANSCRIPTION",
          "No se ha entendido nada. Acércate al micrófono y vuelve a intentarlo.",
        );
      }

      const entry = store.addTranscriptEntry(code, {
        playerId: player.id,
        playerName: player.name,
        roleId: player.roleId,
        text,
        source: "voice",
      });
      hub.broadcastTranscript(code, entry);
      console.log(
        `[stt] ${player.name}@${code} (${body.length} bytes, ${mimeType}): "${text.slice(0, 140)}"`,
      );

      const response: SttResponse = { text, provider: sttProvider.name, entry };
      return response;
    } catch (error: unknown) {
      if (error instanceof SttError) {
        console.error(
          `[stt] Error ${error.kind} de ${player.name}@${code}:`,
          error.message,
          error.cause ?? "",
        );
        if (error.kind === "CONFIG") {
          return apiError(
            reply,
            503,
            "STT_NOT_CONFIGURED",
            "La transcripción no está configurada en el servidor.",
          );
        }
        return apiError(
          reply,
          502,
          "STT_ERROR",
          "No se pudo transcribir el audio. Inténtalo de nuevo.",
        );
      }
      console.error("[stt] Error inesperado:", error);
      return apiError(reply, 500, "STT_ERROR", "Error inesperado al transcribir el audio.");
    }
  },
);

const clockTimer = setInterval(() => {
  const tick = store.tick();
  for (const code of tick.changed) {
    hub.broadcastRoomState(code);
  }
  for (const { code, event } of tick.events) {
    hub.broadcastCommunityEvent(code, event);
  }
}, 1000);
clockTimer.unref();

const cleanupTimer = setInterval(() => store.cleanupStaleRooms(), 10 * 60 * 1000);
cleanupTimer.unref();

async function main(): Promise<void> {
  logEnvSummary();
  console.log(
    `[server] Juez: aviso con ${JUDGE_CONFIG.OVERLAP_SPEAKERS} hablantes durante ` +
      `${JUDGE_CONFIG.OVERLAP_MS} ms, cooldown ${JUDGE_CONFIG.COOLDOWN_MS} ms, ` +
      `silencio forzado ${env.JUDGE_FORCE_MUTE ? "ON" : "OFF"}`,
  );
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`[server] WebSocket disponible en ws://localhost:${env.PORT}/ws`);
}

main().catch((error: unknown) => {
  console.error("[server] Error fatal al arrancar:", error);
  process.exit(1);
});
