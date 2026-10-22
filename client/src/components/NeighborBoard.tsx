import type { RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";
import { BRUTAL } from "../lib/ui";

interface NeighborBoardProps {
  room: RuinaState;
  you: RuinaSelf;
}

export function NeighborBoard({ room, you }: NeighborBoardProps) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className={`${BRUTAL.label} text-stone-500`}>TABLÓN DE LA ASAMBLEA</p>
          <h2 className="text-xl font-black uppercase leading-none tracking-tight">
            Vecinos del bloque
          </h2>
        </div>
        <span className="border-2 border-black bg-white px-2 py-1 font-mono text-[10px] font-black shadow-[2px_2px_0_0_#000]">
          {room.players.filter((player) => player.connected).length}/{room.players.length} EN CASA
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {room.players.map((player) => {
          const isPresident = player.id === room.presidentId && room.phase !== "LOBBY";
          const isVocal = player.id === room.vocalId && room.phase !== "LOBBY";
          const hasVoted = room.phase === "VOTACION_COMISION" && room.votedIds.includes(player.id);
          const hasSigned = room.phase === "FIRMA_CONTRATO" && room.signedIds.includes(player.id);
          const isYou = player.id === you.playerId;
          const isTurn = isPresident && room.phase === "NOMINACION";

          return (
            <article
              key={player.id}
              className={`relative overflow-hidden ${BRUTAL.card} ${
                isTurn ? "turn-pulse" : ""
              } ${player.connected ? "" : "opacity-60"}`}
            >
              <div className="flex h-4 items-center justify-between border-b-2 border-black bg-stone-300 px-2">
                <span className="h-1 w-6 bg-stone-500" />
                <span className="h-1 w-1 rounded-full bg-stone-600" />
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className={`${BRUTAL.label} text-stone-400`}>PISO</p>
                    <p className="text-2xl font-black leading-none tracking-tight">{player.piso}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {isPresident && (
                      <span className="border-2 border-black bg-[#fef08a] px-1 py-0.5 font-mono text-[8px] font-black uppercase">
                        🔑 PRESIDENTE
                      </span>
                    )}
                    {isVocal && (
                      <span className="border-2 border-black bg-[#38bdf8] px-1 py-0.5 font-mono text-[8px] font-black uppercase">
                        PROPUESTO A VOCAL
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 truncate text-sm font-black uppercase leading-tight">
                  {player.nombre}
                </p>

                <div className="mt-1 flex min-h-4 flex-wrap gap-1">
                  {isYou && (
                    <span className="border border-black bg-black px-1 py-0.5 font-mono text-[8px] font-bold text-white">
                      TÚ
                    </span>
                  )}
                  {player.isHost && (
                    <span className="border border-black bg-white px-1 py-0.5 font-mono text-[8px] font-bold">
                      ANFITRIÓN
                    </span>
                  )}
                  {player.isAi && (
                    <span className="border border-black bg-[#38bdf8] px-1 py-0.5 font-mono text-[8px] font-bold">
                      🤖 IA
                    </span>
                  )}
                  {hasVoted && (
                    <span className="border border-black bg-[#22c55e] px-1 py-0.5 font-mono text-[8px] font-bold text-white">
                      YA VOTÓ
                    </span>
                  )}
                  {hasSigned && (
                    <span className="border border-black bg-[#22c55e] px-1 py-0.5 font-mono text-[8px] font-bold text-white">
                      FIRMÓ
                    </span>
                  )}
                  {!player.connected && (
                    <span className="border border-black bg-[#ef4444] px-1 py-0.5 font-mono text-[8px] font-bold text-white">
                      OFFLINE
                    </span>
                  )}
                </div>

                {isTurn && (
                  <p className="mt-1 font-mono text-[8px] font-bold uppercase text-amber-700">
                    ▲ TIENE EL TURNO
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
