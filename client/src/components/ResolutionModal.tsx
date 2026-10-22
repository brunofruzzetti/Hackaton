import { useEffect, useState } from "react";
import type { RuinaState } from "@shared/index";

interface ResolutionModalProps {
  room: RuinaState;
  onLeave: () => void;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={victory ? "Resultado final" : "Resultado de la ronda"}
    >
      <div className="w-full max-w-md animate-[modal-in_.25s_ease-out] rounded-3xl border border-white/20 bg-white p-5 shadow-2xl sm:p-7">
        <div className="text-center">
          <div className="envelope mx-auto" aria-hidden="true">
            <div className="envelope-back" />
            <div className="envelope-letter">
              <span className="text-2xl">{victory ? (honestWin ? "🏆" : "💼") : result?.saboteada ? "🧾" : "✅"}</span>
            </div>
            <div className="envelope-front" />
            <div className="envelope-flap" />
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-amber-700">
            {victory ? "Acta final de la comunidad" : "Sobre del contrato"}
          </p>
          <h2 className={`mt-1 text-2xl font-black leading-tight ${honestWin ? "text-emerald-800" : "text-red-800"}`}>
            {victory
              ? honestWin
                ? "Ganan los vecinos honestos"
                : "Ganan los comerciales encubiertos"
              : result?.motivo === "TRES_RECHAZOS"
                ? "Tres comisiones rechazadas"
                : result?.saboteada
                  ? "Contrato inflado: había sabotaje"
                  : "Obra limpia: contrato honesto"}
          </h2>

          {!victory && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {result?.motivo === "TRES_RECHAZOS"
                ? "La constructora aprovecha el bloqueo de la junta. Punto para los deshonestos."
                : result?.saboteada
                  ? `${result.sabotajes} sabotaje${result.sabotajes === 1 ? "" : "s"} dentro de la comisión. Punto para los deshonestos.`
                  : "Nadie coló un sabotaje. Punto para los honestos."}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              Honestos {room.points.honestos}
            </span>
            <span className="text-xs font-bold text-slate-400">BO3</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
              Comerciales {room.points.deshonestos}
            </span>
          </div>

          {victory ? (
            <button
              type="button"
              onClick={onLeave}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"
            >
              Salir de la junta
            </button>
          ) : (
            <p className="mt-4 text-xs font-semibold text-slate-500">
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
