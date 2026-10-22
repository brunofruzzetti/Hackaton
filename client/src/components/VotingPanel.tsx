import { useEffect, useState } from "react";
import type { RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { RuinaSelf, RuinaSocket } from "../hooks/useRuinaSocket";

interface VotingPanelProps {
  room: RuinaState;
  you: RuinaSelf;
  privateInfo: RuinaPrivateInfo;
  socket: RuinaSocket;
}

function secondsLeft(endsAt: number | null, now: number): number | null {
  if (endsAt === null) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function VoteResult({ room }: { room: RuinaState }) {
  if (!room.voteResult) return null;
  const names = new Map(room.players.map((player) => [player.id, player.nombre]));
  return (
    <div
      className={`mt-3 rounded-xl border p-3 ${
        room.voteResult.aprobada ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-black ${room.voteResult.aprobada ? "text-emerald-800" : "text-red-800"}`}>
          {room.voteResult.aprobada ? "Comisión aprobada" : "Comisión rechazada"}
        </p>
        <span className="text-xs font-bold text-slate-500">
          {room.voteResult.si} sí · {room.voteResult.no} no
        </span>
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {Object.entries(room.voteResult.votos).map(([playerId, approve]) => (
          <li
            key={playerId}
            className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1 text-xs"
          >
            <span className="truncate text-slate-700">{names.get(playerId) ?? "Vecino"}</span>
            <strong className={approve ? "text-emerald-700" : "text-red-700"}>
              {approve ? "APROBAR" : "RECHAZAR"}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VotingPanel({ room, you, privateInfo, socket }: VotingPanelProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (room.phaseEndsAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room.phase, room.phaseEndsAt]);

  const president = room.players.find((player) => player.id === room.presidentId);
  const vocal = room.players.find((player) => player.id === room.vocalId);
  const isPresident = you.playerId === room.presidentId;
  const isVocal = you.playerId === room.vocalId;
  const inCommission = isPresident || isVocal;
  const alreadyVoted = room.votedIds.includes(you.playerId);
  const alreadySigned = room.signedIds.includes(you.playerId);
  const isDishonest = privateInfo.equipo === "DESHONESTOS";
  const countdown = secondsLeft(room.phaseEndsAt, now);
  const pendingSigner = [president, vocal].find(
    (player) => player && !room.signedIds.includes(player.id),
  );
  const pendingRole =
    pendingSigner?.id === president?.id ? "Presidente" : pendingSigner ? "Vocal" : null;
  const otherCommissioner = isPresident ? vocal : isVocal ? president : null;
  const otherRole = otherCommissioner?.id === president?.id ? "presidente" : "vocal";
  const otherHasSigned = otherCommissioner
    ? room.signedIds.includes(otherCommissioner.id)
    : false;

  const showingCommission =
    room.phase === "VOTACION_COMISION" ||
    (room.phase === "FIRMA_CONTRATO" && room.voteResult !== null);

  if (showingCommission) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black text-slate-900">Comisión de obras</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {room.phase === "VOTACION_COMISION" && countdown !== null
              ? `${countdown}s`
              : room.voteResult?.aprobada
                ? "Aprobada"
                : "Rechazada"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Presidente</p>
            <p className="truncate font-bold text-slate-900">{president?.nombre ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-sky-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">Vocal</p>
            <p className="truncate font-bold text-slate-900">{vocal?.nombre ?? "—"}</p>
          </div>
        </div>

        {room.phase === "VOTACION_COMISION" && (
          <>
            <p className="mt-3 text-xs text-slate-500">
              Votación pública y simultánea. Han votado {room.votedIds.length}/{room.players.length}.
              Los votos se revelan al cerrar.
            </p>
            {!alreadyVoted ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => socket.vote(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700"
                >
                  APROBAR COMISIÓN
                </button>
                <button
                  type="button"
                  onClick={() => socket.vote(false)}
                  className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700"
                >
                  RECHAZAR COMISIÓN
                </button>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-500">
                Voto emitido. Esperando al resto… ({room.votedIds.length}/{room.players.length})
              </p>
            )}
          </>
        )}

        <VoteResult room={room} />

        {room.phase === "FIRMA_CONTRATO" && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-slate-900">Firma secreta</h3>
              <span className="text-xs font-bold text-slate-500">
                {countdown !== null ? `${countdown}s` : "Firma"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Solo el presidente y el vocal firman. Los honestos únicamente pueden firmar limpio.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {[president, vocal].map((player) =>
                player ? (
                  <span
                    key={player.id}
                    className={`rounded-full px-2 py-1 font-bold ${
                      room.signedIds.includes(player.id)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {player.nombre}: {room.signedIds.includes(player.id) ? "firmó" : "pendiente"}
                  </span>
                ) : null,
              )}
            </div>

            {inCommission && !alreadySigned ? (
              <div className="mt-3">
                {otherHasSigned && otherCommissioner && (
                  <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-2 text-center text-xs font-semibold text-amber-800">
                    El {otherRole} {otherCommissioner.nombre} ya ha firmado. Falta tu firma.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => socket.sign("LIMPIO")}
                    className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700"
                  >
                    FIRMAR CONTRATO LIMPIO
                  </button>
                  {isDishonest && (
                    <button
                      type="button"
                      onClick={() => socket.sign("SABOTAJE")}
                      className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700"
                    >
                      COLAR SABOTAJE
                    </button>
                  )}
                </div>
              </div>
            ) : inCommission ? (
              <div
                aria-live="polite"
                className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-center text-sm font-semibold text-amber-800"
              >
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                {pendingSigner
                  ? `Esperando firma del ${pendingRole?.toLowerCase()} (${pendingSigner.nombre})…`
                  : "Firmas completas. Abriendo el sobre…"}
              </div>
            ) : (
              <div
                aria-live="polite"
                className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-500"
              >
                {pendingSigner
                  ? `La comisión está firmando. Falta el ${pendingRole?.toLowerCase()} (${pendingSigner.nombre}).`
                  : "La comisión ha terminado de firmar. Abriendo el sobre…"}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  if (room.phase === "NOMINACION") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black text-slate-900">Nominación</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
            Presidente: {president?.nombre ?? "—"}
            {countdown !== null && ` · ${countdown}s`}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          El presidente elige a un vocal para la Comisión de Obras. La comisión firmará el contrato
          después, a solas.
        </p>
        {!isPresident && countdown !== null && (
          <p className="mt-1 text-xs text-slate-400">
            Si el presidente no nomina a tiempo, el servidor elegirá un vocal al azar.
          </p>
        )}

        <VoteResult room={room} />

        {isPresident ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {room.players
              .filter((player) => player.id !== you.playerId)
              .map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => socket.nominate(player.id)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-left transition hover:border-amber-400 hover:bg-amber-50"
                >
                  <span className="block text-sm font-bold text-slate-900">{player.nombre}</span>
                  <span className="block text-xs text-slate-500">Piso {player.piso}</span>
                </button>
              ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">
            Esperando la nominación del presidente…
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">La junta está resolviendo</h2>
      <p className="mt-2 text-sm text-slate-600">
        El sobre del contrato está sobre la mesa. En unos segundos se conocerá el resultado.
      </p>
    </section>
  );
}
