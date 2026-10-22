import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

export interface SupabaseRoomSnapshot {
  configured: boolean;
  connected: boolean;
  error: string | null;
  sala: Record<string, unknown> | null;
  jugadores: Array<Record<string, unknown>>;
  lastEventAt: number | null;
}

const EMPTY: SupabaseRoomSnapshot = {
  configured: supabaseConfigured,
  connected: false,
  error: null,
  sala: null,
  jugadores: [],
  lastEventAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRow(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/**
 * Escucha los cambios de la sala en Supabase Realtime. Es una capa de lectura
 * opcional: las acciones del juego siguen pasando por el WS autoritativo.
 */
export function useSupabaseRoom(code: string | null): SupabaseRoomSnapshot {
  const [snapshot, setSnapshot] = useState<SupabaseRoomSnapshot>(EMPTY);

  useEffect(() => {
    if (!supabase || !code) {
      setSnapshot(EMPTY);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function init(): Promise<void> {
      if (!supabase) return;
      const { data: sala, error } = await supabase
        .from("salas")
        .select("*")
        .eq("codigo", code)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setSnapshot((current) => ({
          ...current,
          configured: true,
          connected: false,
          error: error.message,
        }));
        return;
      }

      const salaRow = asRow(sala);
      let jugadores: Array<Record<string, unknown>> = [];
      if (salaRow && typeof salaRow.id === "string") {
        const playersResponse = await supabase
          .from("jugadores")
          // Solo columnas públicas. Nunca seleccionar equipos/secretos aquí.
          .select("id,sala_id,nombre,piso,es_anfitrion,conectado")
          .eq("sala_id", salaRow.id);
        if (cancelled) return;
        if (playersResponse.error) {
          setSnapshot((current) => ({ ...current, error: playersResponse.error.message }));
        } else {
          jugadores = (playersResponse.data ?? [])
            .map(asRow)
            .filter((row): row is Record<string, unknown> => row !== null);
        }
      }

      setSnapshot({
        configured: true,
        connected: false,
        error: null,
        sala: salaRow,
        jugadores,
        lastEventAt: null,
      });

      const salaId = salaRow && typeof salaRow.id === "string" ? salaRow.id : null;
      channel = supabase
        .channel(`ruina-sala-${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "salas", filter: `codigo=eq.${code}` },
          (payload) => {
            setSnapshot((current) => ({
              ...current,
              sala: asRow(payload.new) ?? current.sala,
              lastEventAt: Date.now(),
            }));
          },
        )
        .on(
          "postgres_changes",
          salaId
            ? {
                event: "*",
                schema: "public",
                table: "jugadores",
                filter: `sala_id=eq.${salaId}`,
              }
            : { event: "*", schema: "public", table: "jugadores" },
          (payload) => {
            const row = asRow(payload.new);
            if (!row || typeof row.id !== "string") return;
            setSnapshot((current) => {
              const next = current.jugadores.filter((player) => player.id !== row.id);
              if (payload.eventType !== "DELETE") next.push(row);
              return { ...current, jugadores: next, lastEventAt: Date.now() };
            });
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          setSnapshot((current) => ({
            ...current,
            connected: status === "SUBSCRIBED",
          }));
        });
    }

    void init();

    return () => {
      cancelled = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [code]);

  return snapshot;
}
