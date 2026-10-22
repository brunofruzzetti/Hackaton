import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DEEPSEEK_API_KEY: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  STT_PROVIDER: z.enum(["openai", "deepgram", "mock"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(["deepseek", "mock"]).default("deepseek"),
  JUDGE_FORCE_MUTE: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const livekitConfigured = Boolean(
  env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET,
);

export function logEnvSummary(): void {
  console.log("[env] Puerto:", env.PORT);
  console.log(
    "[env] LiveKit:",
    livekitConfigured ? `configurado (${env.LIVEKIT_URL})` : "NO configurado (audio deshabilitado)",
  );
  console.log("[env] STT:", env.STT_PROVIDER);
  console.log(
    "[env] LLM:",
    env.LLM_PROVIDER,
    env.DEEPSEEK_API_KEY || env.LLM_PROVIDER === "mock" ? "" : "(sin DEEPSEEK_API_KEY: se usará mock)",
  );
  console.log("[env] Silencio forzado del juez:", env.JUDGE_FORCE_MUTE);
}
