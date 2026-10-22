import { useEffect, useState } from "react";
import type { RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { RuinaSelf, RuinaSocket } from "../hooks/useRuinaSocket";
import { BRUTAL } from "../lib/ui";

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

function TimerBadge({ countdown }: { countdown: number | null }) {
  if (countdown === null) return null;
  return (
    <span
      className={`border-2 border-black px-2 py-1 font-mono text-xs font-black shadow-[2px_2px_0_0_#000] ${
        countdown <= 10 ? "bg-[#ef4444] text-white" : "bg-white"
      }`}
    >
      ⏱ {countdown}s
    </span>
  );
}

function VoteResult({ room }: { room: RuinaState }) {
  if (!room.voteResult) return null;
  const names = new Map(room.players.map((player) => [player.id, player.nombre]));
  return (
    <div
      className={`mt-3 border-2 border-black shadow-[3px_3px_0_0_#000] ${
        room.voteResult.aprobada ? "bg-[#dcfce7]" : "bg-[#fee2e2]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-white px-2 py-1">
        <p className="font-mono text-[10px] font-black uppercase tracking-wider">
          ACTA DE VOTACIÓN
        </p>
        <span
          className={`border border-black px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
            room.voteResult.aprobada ? "bg-[#22c55e] text-white" : "bg-[#ef4444] text-white"
          }`}
        >
          {room.voteResult.aprobada ? "APROBADA" : "RECHAZADA"}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <p className="font-mono text-[10px] font-bold">
          {room.voteResult.si} A FAVOR · {room.voteResult.no} EN CONTRA
        </p>
        <ul className="mt-1 grid gap-1 sm:grid-cols-2">
          {Object.entries(room.voteResult.votos).map(([playerId, approve]) => (
            <li
              key={playerId}
              className="flex items-center justify-between gap-2 border border-black bg-white/70 px-1.5 py-0.5 font-mono text-[10px]"
            >
              <span className="truncate">{names.get(playerId) ?? "VECINO"}</span>
              <strong className={approve ? "text-emerald-700" : "text-red-700"}>
                {approve ? "APROBAR" : "RECHAZAR"}
              </strong>
            </li>
          ))}
        </ul>
      </div>
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
      <section className={`${BRUTAL.cardLg} overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 border-b-[3px] border-black bg-[#fef08a] px-3 py-2">
          <div>
            <p className={`${BRUTAL.label} text-stone-600`}>COMISIÓN DE OBRAS</p>
            <h2 className="text-xl font-black uppercase leading-none tracking-tight">
              {room.phase === "FIRMA_CONTRATO" ? "Firma del contrato" : "Votación pública"}
            </h2>
          </div>
          <TimerBadge countdown={countdown} />
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="border-2 border-black bg-[#fef08a] p-2 shadow-[2px_2px_0_0_#000]">
              <p className={`${BRUTAL.label} text-stone-600`}>🔑 PRESIDENTE</p>
              <p className="truncate text-sm font-black uppercase">{president?.nombre ?? "—"}</p>
            </div>
            <div className="border-2 border-black bg-[#38bdf8] p-2 shadow-[2px_2px_0_0_#000]">
              <p className={`${BRUTAL.label} text-stone-800`}>🪪 VOCAL</p>
              <p className="truncate text-sm font-black uppercase">{vocal?.nombre ?? "—"}</p>
            </div>
          </div>

          {room.phase === "VOTACION_COMISION" && (
            <>
              <p className="mt-3 border-2 border-dashed border-black bg-white px-2 py-1.5 font-mono text-[10px] leading-relaxed">
                VOTACIÓN PÚBLICA Y SIMULTÁNEA. Han votado{" "}
                <strong>
                  {room.votedIds.length}/{room.players.length}
                </strong>
                . Los votos se revelan al cerrar. Empate = rechazo.
              </p>
              {!alreadyVoted ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => socket.vote(true)}
                    className={`${BRUTAL.button} flex min-h-[76px] items-center justify-center gap-2 bg-[#22c55e] px-3 py-3 text-sm font-black uppercase leading-tight text-white`}
                  >
                    ✅ APROBAR COMISIÓN
                  </button>
                  <button
                    type="button"
                    onClick={() => socket.vote(false)}
                    className={`${BRUTAL.button} flex min-h-[76px] items-center justify-center gap-2 bg-[#ef4444] px-3 py-3 text-sm font-black uppercase leading-tight text-white`}
                  >
                    ❌ DESCONFIAR / RECHAZAR
                  </button>
                </div>
              ) : (
                <div
                  aria-live="polite"
                  className="mt-3 border-2 border-black bg-stone-100 px-3 py-3 text-center font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#000]"
                >
                  VOTO EMITIDO · ESPERANDO AL RESTO ({room.votedIds.length}/{room.players.length})
                </div>
              )}
            </>
          )}

          <VoteResult room={room} />

          {room.phase === "FIRMA_CONTRATO" && (
            <div className="mt-4 border-2 border-black shadow-[3px_3px_0_0_#000]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-[#38bdf8] px-2 py-1">
                <p className="font-mono text-[10px] font-black uppercase tracking-wider">
                  EXPEDIENTE CONFIDENCIAL · FIRMA A SOLAS
                </p>
                <span className="rotate-2 border border-black bg-white px-1 py-0.5 font-mono text-[8px] font-black">
                  NO REVELAR
                </span>
              </div>
              <div className="bg-[#fffdf7] p-2.5">
                <p className="font-mono text-[10px] leading-relaxed text-stone-600">
                  Solo firman el presidente y el vocal. Un honesto solo puede firmar limpio; un
                  comercial puede colar una cláusula trampa.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[president, vocal].map((player) =>
                    player ? (
                      <span
                        key={player.id}
                        className={`border-2 border-black px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
                          room.signedIds.includes(player.id)
                            ? "bg-[#22c55e] text-white"
                            : "bg-white text-stone-500"
                        }`}
                      >
                        {player.nombre}:{" "}
                        {room.signedIds.includes(player.id) ? "FIRMÓ" : "PENDIENTE"}
                      </span>
                    ) : null,
                  )}
                </div>

                {inCommission && !alreadySigned ? (
                  <div className="mt-3">
                    {otherHasSigned && otherCommissioner && (
                      <p className="mb-2 border-2 border-black bg-[#fef08a] px-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase">
                        El {otherRole} {otherCommissioner.nombre} ya firmó. Falta tu firma.
                      </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => socket.sign("LIMPIO")}
                        className={`${BRUTAL.button} min-h-[68px] bg-[#22c55e] px-3 py-2 text-sm font-black uppercase text-white`}
                      >
                        ✍️ FIRMA LIMPIA
                      </button>
                      {isDishonest && (
                        <button
                          type="button"
                          onClick={() => socket.sign("SABOTAJE")}
                          className={`${BRUTAL.button} min-h-[68px] bg-[#ef4444] px-3 py-2 text-sm font-black uppercase leading-tight text-white`}
                        >
                          😈 METER CLÁUSULA TRAMPA
                        </button>
                      )}
                    </div>
                  </div>
                ) : inCommission ? (
                  <div
                    aria-live="polite"
                    className="mt-3 flex items-center justify-center gap-2 border-2 border-black bg-[#fef08a] px-2 py-3 text-center font-mono text-xs font-bold uppercase"
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
                    {pendingSigner
                      ? `Esperando firma del ${pendingRole?.toLowerCase()} (${pendingSigner.nombre})…`
                      : "Firmas completas. Abriendo el sobre…"}
                  </div>
                ) : (
                  <div
                    aria-live="polite"
                    className="mt-3 border-2 border-dashed border-black bg-stone-50 px-2 py-2 text-center font-mono text-[10px] font-bold uppercase text-stone-500"
                  >
                    {pendingSigner
                      ? `La comisión está firmando. Falta el ${pendingRole?.toLowerCase()} (${pendingSigner.nombre}).`
                      : "La comisión ha terminado de firmar. Abriendo el sobre…"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (room.phase === "NOMINACION") {
    return (
      <section className={`${BRUTAL.cardLg} overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 border-b-[3px] border-black bg-[#fef08a] px-3 py-2">
          <div>
            <p className={`${BRUTAL.label} text-stone-600`}>ORDEN DEL DÍA</p>
            <h2 className="text-xl font-black uppercase leading-none tracking-tight">
              Nominar vocal
            </h2>
          </div>
          <TimerBadge countdown={countdown} />
        </div>
        <div className="p-3">
          <p className="border-2 border-dashed border-black bg-white px-2 py-1.5 font-mono text-[10px] leading-relaxed">
            El presidente tiene la llave del portal y elige a un vocal para la Comisión de Obras.
            Después, la comisión firmará el contrato a solas.
          </p>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase">
            🔑 PRESIDENTE: <strong>{president?.nombre ?? "—"}</strong>
          </p>

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
                    className={`${BRUTAL.button} flex min-h-[62px] items-center justify-between gap-2 bg-white px-3 py-2 text-left hover:bg-[#fef08a]`}
                  >
                    <span>
                      <span className="block font-mono text-[9px] font-bold uppercase text-stone-500">
                        PISO {player.piso}
                      </span>
                      <span className="block text-sm font-black uppercase">{player.nombre}</span>
                    </span>
                    <span className="text-lg" aria-hidden="true">
                      🪪
                    </span>
                  </button>
                ))}
            </div>
          ) : (
            <p className="mt-3 border-2 border-black bg-stone-100 px-3 py-4 text-center font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#000]">
              ⏳ ESPERANDO LA NOMINACIÓN DEL PRESIDENTE
              {president ? ` (${president.nombre})` : ""}
            </p>
          )}
          {!isPresident && countdown !== null && (
            <p className="mt-2 text-center font-mono text-[9px] font-bold uppercase text-stone-400">
              Si no nomina a tiempo, el servidor elegirá un vocal al azar.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="border-b-[3px] border-black bg-[#38bdf8] px-3 py-2">
        <p className={`${BRUTAL.label} text-stone-800`}>ACTA EN CURSO</p>
        <h2 className="text-xl font-black uppercase leading-none tracking-tight">
          La junta está resolviendo
        </h2>
      </div>
      <div className="p-3">
        <p className="border-2 border-dashed border-black bg-[#fef08a] px-2 py-2 font-mono text-xs leading-relaxed">
          El sobre del contrato está sobre la mesa. En unos segundos se conocerá el resultado.
        </p>
      </div>
    </section>
  );
}
