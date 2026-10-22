import Fastify from "fastify";
import {
  GAME_CONFIG,
  JUDGE_CONFIG,
  type PublicConfig,
} from "@shared/index";
import { env, livekitConfigured, logEnvSummary } from "./env.js";
import { RoomStore } from "./roomStore.js";
import { WsHub } from "./wsHub.js";

const app = Fastify({ logger: true });
const store = new RoomStore();
const hub = new WsHub(app.server, store);

const publicConfig: PublicConfig = {
  livekitConfigured,
  livekitUrl: livekitConfigured ? (env.LIVEKIT_URL ?? null) : null,
  sttProvider: env.STT_PROVIDER,
  judgeForceMute: env.JUDGE_FORCE_MUTE,
  maxParticipants: GAME_CONFIG.MAX_PARTICIPANTS,
  maxAiPlayers: GAME_CONFIG.MAX_AI_PLAYERS,
  minParticipants: GAME_CONFIG.MIN_PARTICIPANTS,
};

app.get("/api/health", async () => ({
  ok: true,
  service: "junta-de-vecinos",
  livekitConfigured,
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
