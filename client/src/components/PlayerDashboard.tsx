import type { RuinaPhase, RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";

const PHASE_LABEL: Record<RuinaPhase, string> = {
  LOBBY: "Lobby",
  NOMINACION: "Nominación",
  VOTACION_COMISION: "Votación de comisión",
  FIRMA_CONTRATO: "Firma secreta",
  RESOLUCION_RONDA: "Resolución",
  VICTORIA: "Victoria",
};

interface PlayerDashboardProps {
  room: RuinaState;
  you: RuinaSelf;
  privateInfo: RuinaPrivateInfo;
  supabaseRealtime: { configured: boolean; connected: boolean };
}

export function PlayerDashboard({ room, you, privateInfo, supabaseRealtime }: PlayerDashboardProps) {
  const president = room.players.find((player) => player.id === room.presidentId);
  const vocal = room.players.find((player) => player.id === room.vocalId);
  const isDishonest = privateInfo.equipo === "DESHONESTOS";

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 py-3 text-white backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              Junta de Ruina · {PHASE_LABEL[room.phase]}
            </p>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-black tracking-tight">Sala {room.code}</h1>
              <span className="text-xs font-semibold text-slate-400">
                Ronda {room.round}/3 · Piso {room.players.find((p) => p.id === you.playerId)?.piso}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-xl border border-emerald-500/40 bg-emerald-500/10">
              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Honestos
              </span>
              <span className="bg-emerald-500 px-2.5 py-1 text-sm font-black text-emerald-950">
                {room.points.honestos}
              </span>
            </div>
            <span className="text-xs font-black text-slate-500">BO3</span>
            <div className="flex overflow-hidden rounded-xl border border-red-500/40 bg-red-500/10">
              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                Comerciales
              </span>
              <span className="bg-red-500 px-2.5 py-1 text-sm font-black text-red-950">
                {room.points.deshonestos}
              </span>
            </div>
            {supabaseRealtime.configured && (
              <span
                className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline ${
                  supabaseRealtime.connected
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                Supabase {supabaseRealtime.connected ? "live" : "…"}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section
          className={`rounded-2xl border p-4 shadow-sm ${
            isDishonest ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Tu expediente
              </p>
              <h2 className={`mt-1 text-lg font-black ${isDishonest ? "text-red-800" : "text-emerald-800"}`}>
                {isDishonest ? "Comercial encubierto" : "Vecino honesto"}
              </h2>
              <p className="text-xs text-slate-600">
                Piso {room.players.find((p) => p.id === you.playerId)?.piso} ·{" "}
                {isDishonest ? "Sabotea contratos sin que te pillen." : "Firma limpio y caza sabotajes."}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                isDishonest ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {isDishonest ? "Deshonesto" : "Honesto"}
            </span>
          </div>

          {isDishonest && privateInfo.companeros.length > 0 && (
            <p className="mt-2 rounded-lg bg-red-100 px-2.5 py-2 text-xs text-red-800">
              <strong>Compinches:</strong>{" "}
              {privateInfo.companeros.map((item) => `${item.nombre} (${item.piso})`).join(", ")}
            </p>
          )}

          <div className="-rotate-1 rounded-sm border border-yellow-300 bg-yellow-100 p-3 shadow-md shadow-yellow-900/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-yellow-800">
                Nota confidencial · sobre el {privateInfo.secreto.sobrePiso}
              </p>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                  privateInfo.secreto.tipo === "SOSPECHOSO"
                    ? "bg-red-200 text-red-800"
                    : privateInfo.secreto.tipo === "LIMPIO"
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-amber-200 text-amber-800"
                }`}
              >
                {privateInfo.secreto.tipo.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 font-hand text-sm leading-snug text-yellow-950">
              {privateInfo.secreto.texto}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
            Contrato de la ronda
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight text-slate-900">{room.contract.titulo}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{room.contract.descripcion}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="font-bold text-slate-400">Presidente</p>
              <p className="truncate font-semibold text-slate-800">{president?.nombre ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="font-bold text-slate-400">Vocal</p>
              <p className="truncate font-semibold text-slate-800">{vocal?.nombre ?? "Sin nominar"}</p>
            </div>
          </div>
          {room.rejectionCount > 0 && (
            <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700">
              Rechazos seguidos: {room.rejectionCount}/3. A la tercera, punto para los deshonestos.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Vecinos</h2>
          <span className="text-xs font-semibold text-slate-400">
            {room.players.filter((player) => player.connected).length}/{room.players.length} conectados
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`rounded-xl border p-2.5 ${
                player.connected ? "border-slate-200 bg-slate-50" : "border-red-100 bg-red-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {player.nombre}
                  {player.id === you.playerId && <span className="ml-1 text-[10px] text-slate-400">(tú)</span>}
                </p>
                {player.id === room.presidentId && (
                  <span className="shrink-0 rounded bg-amber-200 px-1 py-0.5 text-[9px] font-black text-amber-900">
                    PRES
                  </span>
                )}
                {player.id === room.vocalId && (
                  <span className="shrink-0 rounded bg-sky-200 px-1 py-0.5 text-[9px] font-black text-sky-900">
                    VOCAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {player.piso}
                {room.phase === "VOTACION_COMISION" && room.votedIds.includes(player.id) && " · votó"}
                {room.phase === "FIRMA_CONTRATO" && room.signedIds.includes(player.id) && " · firmó"}
                {!player.connected && " · offline"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
