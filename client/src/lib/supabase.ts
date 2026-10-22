import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente opcional. Si no hay credenciales, el juego sigue funcionando con el
 * WebSocket autoritativo del servidor. Con credenciales, además se escuchan los
 * cambios de `salas` y `jugadores` por Supabase Realtime.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null;

export const supabaseConfigured = Boolean(supabase);
