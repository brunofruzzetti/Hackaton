import type { RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { Room } from "./ruinaStore.js";

interface SupabaseMirrorConfig {
  url: string;
  key: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSupabaseMirrorFromEnv(): SupabaseMirror | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return new SupabaseMirror({ url: trimTrailingSlash(url), key });
}

/**
 * Espejo opcional de la partida en Supabase para que los clientes puedan
 * escuchar `salas` y `jugadores` con Supabase Realtime.
 *
 * El servidor sigue siendo la autoridad y la fuente de verdad. Si Supabase
 * falla, el juego continúa por WebSocket sin bloquearse.
 */
export class SupabaseMirror {
  private readonly lastPublish = new Map<string, number>();
  private readonly config: SupabaseMirrorConfig;
  private warned = false;

  constructor(config: SupabaseMirrorConfig) {
    this.config = config;
  }

  async publish(room: Room, state: RuinaState): Promise<void> {
    const now = Date.now();
    const last = this.lastPublish.get(room.code) ?? 0;
    if (now - last < 600) return;
    this.lastPublish.set(room.code, now);

    try {
      const sala = await this.upsert<{ id: string }>(
        "salas",
        "codigo",
        {
          codigo: room.code,
          fase: state.phase,
          ronda: state.round,
          puntos_honestos: state.points.honestos,
          puntos_deshonestos: state.points.deshonestos,
          indice_presidente: room.presidentIndex,
          vocal_id: room.vocalId,
          intentos_rechazo: state.rejectionCount,
          contrato: state.contract,
          votos: state.votes,
          ultimo_resultado: state.lastResult,
          ganador: state.winner,
          estado: state,
        },
      );
      if (!sala || typeof sala.id !== "string") return;

      const players = room.players.map((player) => {
        const equipo = player.team;
        const secreto = room.secrets.get(player.id);
        const privateInfo: RuinaPrivateInfo | null =
          equipo && secreto
            ? {
                equipo,
                companeros:
                  equipo === "DESHONESTOS"
                    ? room.players
                        .filter((other) => other.team === "DESHONESTOS" && other.id !== player.id)
                        .map((other) => ({
                          id: other.id,
                          nombre: other.nombre,
                          piso: other.piso,
                        }))
                    : [],
                secreto,
              }
            : null;
        return {
          id: player.id,
          sala_id: sala.id,
          nombre: player.nombre,
          piso: player.piso,
          es_deshonesto: player.team === "DESHONESTOS",
          es_anfitrion: player.isHost,
          conectado: player.connected,
          informacion_privada: privateInfo,
        };
      });

      await this.upsert("jugadores", "id", players);
    } catch (error: unknown) {
      if (!this.warned) {
        this.warned = true;
        console.warn(
          "[supabase] No se pudo sincronizar la sala (el juego sigue por WS):",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  private async upsert<T = unknown>(
    table: string,
    onConflict: string,
    rows: Record<string, unknown> | Array<Record<string, unknown>>,
  ): Promise<T | null> {
    const response = await fetch(
      `${this.config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
      {
        method: "POST",
        headers: {
          apikey: this.config.key,
          Authorization: `Bearer ${this.config.key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(rows),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${body.slice(0, 240)}`);
    }
    const data: unknown = await response.json();
    if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
    return (data as T | null) ?? null;
  }
}
