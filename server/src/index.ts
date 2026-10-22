import Fastify from "fastify";
import { z } from "zod";
import { RUINA_MAX_PLAYERS, RUINA_MIN_PLAYERS } from "@shared/index";
import { env, livekitConfigured, logEnvSummary, supabaseConfigured } from "./env.js";
import { GameError } from "./errors.js";
import { createLivekitToken, getLivekitConfigFromEnv } from "./livekit.js";
import { RuinaStore } from "./ruinaStore.js";
import { RuinaWsHub } from "./ruinaWs.js";
import { getSupabaseMirrorFromEnv } from "./supabaseMirror.js";

const app = Fastify({ logger: true });
const store = new RuinaStore();
const supabaseMirror = getSupabaseMirrorFromEnv();
const hub = new RuinaWsHub(app.server, store, supabaseMirror);

app.get("/api/health", async () => ({
  ok: true,
  service: "sabotea-la-junta",
  livekitConfigured,
  supabaseConfigured,
  rooms: store.roomCount,
}));

app.get("/api/config", async () => ({
  livekitConfigured,
  livekitUrl: livekitConfigured ? (env.LIVEKIT_URL ?? null) : null,
  supabaseConfigured,
  minPlayers: RUINA_MIN_PLAYERS,
  maxPlayers: RUINA_MAX_PLAYERS,
}));

app.get("/api/debug/room/:code", async (request, reply) => {
  const params = request.params as { code?: string };
  try {
    return store.getPublicState(store.getRoomOrThrow(params.code ?? ""));
  } catch {
    return reply.code(404).send({ error: "ROOM_NOT_FOUND" });
  }
});

const tokenBodySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{4}$/),
  playerId: z.string().min(1).max(64),
  sessionToken: z.string().min(1).max(128),
});

app.post("/api/livekit/token", async (request, reply) => {
  const parsed = tokenBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "INVALID_REQUEST", message: "Faltan datos." });
  }
  const config = getLivekitConfigFromEnv();
  if (!config) {
    return reply.code(503).send({
      error: "LIVEKIT_NOT_CONFIGURED",
      message: "El audio no está configurado en el servidor.",
    });
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
      playerName: player.nombre,
      config,
    });
    console.log(`[ruina/livekit] Token para ${player.nombre} en ${result.roomName}`);
    return result;
  } catch (error: unknown) {
    if (error instanceof GameError) {
      return reply
        .code(error.code === "UNAUTHORIZED" ? 401 : 404)
        .send({ error: error.code, message: error.message });
    }
    console.error("[ruina/livekit] Error:", error);
    return reply.code(500).send({ error: "SERVER_ERROR", message: "No se pudo generar el token." });
  }
});

const clock = setInterval(() => {
  for (const code of store.tick()) {
    hub.broadcastState(code);
  }
}, 1000);
clock.unref();

const cleanup = setInterval(() => store.cleanupStaleRooms(), 10 * 60 * 1000);
cleanup.unref();

async function main(): Promise<void> {
  logEnvSummary();
  console.log(`[ruina] Salas de ${RUINA_MIN_PLAYERS} a ${RUINA_MAX_PLAYERS} jugadores`);
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`[ruina] WS en ws://localhost:${env.PORT}/ws`);
}

main().catch((error: unknown) => {
  console.error("[ruina] Error fatal:", error);
  process.exit(1);
});
