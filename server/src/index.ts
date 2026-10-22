import Fastify from "fastify";
import { env, livekitConfigured, logEnvSummary } from "./env.js";

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({
  ok: true,
  service: "junta-de-vecinos",
  livekitConfigured,
}));

app.get("/api/config", async () => ({
  livekitConfigured,
  livekitUrl: livekitConfigured ? env.LIVEKIT_URL : null,
  sttProvider: env.STT_PROVIDER,
}));

async function main(): Promise<void> {
  logEnvSummary();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("[server] Error fatal al arrancar:", error);
  process.exit(1);
});
