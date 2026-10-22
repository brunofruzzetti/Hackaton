import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Funciona tanto si el script se lanza desde /server como desde la raíz.
loadDotenv({ path: [".env", "../.env"] });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_PUBLIC_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  PUBLIC_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
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

export const supabaseConfigured = Boolean(
  env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY),
);

export function logEnvSummary(): void {
  console.log("[env] Puerto:", env.PORT);
  console.log(
    "[env] LiveKit:",
    livekitConfigured ? `configurado (${env.LIVEKIT_URL})` : "NO configurado (audio deshabilitado)",
  );
  console.log(
    "[env] Supabase:",
    supabaseConfigured ? "espejo Realtime activo" : "NO configurado (solo WebSocket)",
  );
}
