import { useEffect, useState } from "react";
import type { RuinaState } from "@shared/index";
import { BRUTAL } from "../lib/ui";

interface ResolutionModalProps {
  room: RuinaState;
  onLeave: () => void;
}

function stampText(room: RuinaState): string {
  if (room.phase === "VICTORIA") {
    return room.winner === "HONESTOS" ? "VICTORIA VECINAL" : "VICTORIA COMERCIAL";
  }
  if (room.lastResult?.motivo === "TRES_RECHAZOS") return "JUNTA BLOQUEADA";
  if (room.lastResult?.saboteada) return "¡SABOTAJE DETECTADO!";
  return "OBRA APROBADA SIN TRAMPA";
}

export function ResolutionModal({ room, onLeave }: ResolutionModalProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (room.phaseEndsAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room.phaseEndsAt]);

  if (room.phase !== "RESOLUCION_RONDA" && room.phase !== "VICTORIA") return null;

  const result = room.lastResult;
  const countdown =
    room.phaseEndsAt === null ? null : Math.max(0, Math.ceil((room.phaseEndsAt - now) / 1000));
  const victory = room.phase === "VICTORIA";
  const honestWin = (victory ? room.winner : result?.ganador) === "HONESTOS";
  const blocked = result?.motivo === "TRES_RECHAZOS";
  const sabotaged = Boolean(result?.saboteada);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-[2px] sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={victory ? "Resultado final" : "Resultado de la ronda"}
    >
      <div className="relative w-full max-w-md border-[4px] border-black bg-[#fffdf7] p-4 shadow-[10px_10px_0_0_#000] sm:p-6">
        <div className="absolute -top-3 left-6 rotate-[-4deg] border-2 border-black bg-[#fef08a] px-2 py-0.5 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
          ACTA DE RESOLUCIÓN · RONDA {room.round}
        </div>

        <div className="mt-2 text-center">
          <div className="relative mx-auto h-[142px] w-[200px]">
            <div className="envelope mx-auto" aria-hidden="true">
              <div className="envelope-back" />
              <div className="envelope-letter">
                <span className="text-3xl">{victory ? (honestWin ? "🏆" : "💼") : sabotaged ? "🧾" : "✅"}</span>
              </div>
              <div className="envelope-front" />
              <div className="envelope-flap" />
            </div>
            <div
              className={`stamp-in absolute -right-5 top-5 rotate-[-8deg] border-[3px] border-black px-2 py-1 font-black uppercase leading-none shadow-[3px_3px_0_0_#000] ${
                honestWin ? "bg-[#22c55e] text-white" : "bg-[#ef4444] text-white"
              }`}
            >
              <span className="block max-w-[150px] text-center text-xs sm:text-sm">{stampText(room)}</span>
              <span className="mt-0.5 block text-center font-mono text-[7px] tracking-wider opacity-80">
                JUNTA DE RUINA · 3.º B
              </span>
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-black uppercase leading-none tracking-tight">
            {victory
              ? honestWin
                ? "Ganan los vecinos honestos"
                : "Ganan los comerciales"
              : blocked
                ? "La junta se ha bloqueado"
                : sabotaged
                  ? "Contrato inflado"
                  : "Contrato limpio"}
          </h2>

          {!victory && (
            <p className="mx-auto mt-2 max-w-sm border-2 border-dashed border-black bg-white px-2 py-2 font-mono text-xs leading-relaxed">
              {blocked
                ? "Tres comisiones rechazadas seguidas. La constructora aprovecha el bloqueo: punto para los deshonestos."
                : sabotaged
                  ? `${result?.sabotajes ?? 0} sabotaje${result?.sabotajes === 1 ? "" : "s"} dentro de la comisión. Punto para los deshonestos.`
                  : "Nadie coló una cláusula trampa. Punto para los honestos."}
            </p>
          )}

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="border-2 border-black bg-[#22c55e] px-2 py-1 font-mono text-[10px] font-black uppercase text-white shadow-[2px_2px_0_0_#000]">
              HONESTOS {room.points.honestos}
            </span>
            <span className="font-mono text-[10px] font-black">BO3</span>
            <span className="border-2 border-black bg-[#ef4444] px-2 py-1 font-mono text-[10px] font-black uppercase text-white shadow-[2px_2px_0_0_#000]">
              COMERCIALES {room.points.deshonestos}
            </span>
          </div>

          {victory ? (
            <button
              type="button"
              onClick={onLeave}
              className={`${BRUTAL.button} mt-4 w-full bg-black px-4 py-3 text-sm font-black uppercase tracking-wide text-[#fef08a]`}
            >
              CERRAR EL ACTA Y SALIR
            </button>
          ) : (
            <p className="mt-3 font-mono text-[10px] font-bold uppercase text-stone-500">
              {countdown !== null && countdown > 0
                ? `Siguiente ronda en ${countdown}s…`
                : "Preparando la siguiente ronda…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
