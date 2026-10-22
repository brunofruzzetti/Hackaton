import type { RuinaState } from "@shared/index";
import { BRUTAL, PHASE_LABEL, PHASE_SHORT } from "../lib/ui";

interface JuntaHeaderProps {
  room: RuinaState;
  supabaseRealtime: { configured: boolean; connected: boolean };
}

export function JuntaHeader({ room, supabaseRealtime }: JuntaHeaderProps) {
  const president = room.players.find((player) => player.id === room.presidentId);
  const stamps = [0, 1, 2].map((index) => {
    if (index < room.points.honestos) return "honest" as const;
    if (index < room.points.honestos + room.points.deshonestos) return "corrupt" as const;
    return "pending" as const;
  });

  return (
    <header className="sticky top-0 z-30 -mx-3 border-b-[3px] border-black bg-[#f4efe6]/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:mx-0 lg:border-[3px] lg:shadow-[6px_6px_0_0_#000]">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${BRUTAL.label} text-stone-500`}>
              ACTA OFICIAL · COMUNIDAD DE PROPIETARIOS
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <h1 className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                Código {room.code}
              </h1>
              <span className="font-mono text-xs font-bold text-stone-500">
                RONDA {room.round} DE 3
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5" aria-label="Marcador Bo3">
            <div className="mr-1 hidden flex-col items-end sm:flex">
              <span className={`${BRUTAL.label} text-stone-500`}>BO3</span>
              <span className="font-mono text-[10px] font-bold text-stone-500">
                PUEBLO / COMERCIALES
              </span>
            </div>
            {stamps.map((stamp, index) => (
              <span
                key={`${stamp}-${index}`}
                title={
                  stamp === "honest"
                    ? "Ronda ganada por el pueblo"
                    : stamp === "corrupt"
                      ? "Ronda ganada por los comerciales"
                      : "Ronda pendiente"
                }
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-sm font-black shadow-[2px_2px_0_0_#000] sm:h-11 sm:w-11 sm:text-lg ${
                  stamp === "honest"
                    ? "bg-[#22c55e] text-white"
                    : stamp === "corrupt"
                      ? "bg-[#ef4444] text-white"
                      : "border-dashed bg-stone-200 text-stone-400"
                }`}
              >
                {stamp === "honest" ? "✓" : stamp === "corrupt" ? "✕" : "?"}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-[1.05fr_1.2fr_0.8fr]">
          <div className="flex items-center gap-2 border-2 border-black bg-[#fef08a] px-2 py-1 shadow-[2px_2px_0_0_#000]">
            <span className="text-xl" aria-hidden="true">
              🔑
            </span>
            <div className="min-w-0">
              <p className={`${BRUTAL.label} text-stone-700`}>PRESIDENTE ACTUAL</p>
              <p className="truncate text-sm font-black uppercase leading-tight">
                {president?.nombre ?? "—"}
              </p>
            </div>
          </div>

          <div className="order-last col-span-2 flex items-center justify-between gap-2 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000] sm:order-none sm:col-span-1">
            <div>
              <p className={`${BRUTAL.label} text-stone-500`}>FASE ACTUAL</p>
              <p className="text-base font-black uppercase leading-none tracking-tight sm:text-lg">
                {PHASE_LABEL[room.phase] ?? room.phase}
              </p>
            </div>
            <span className="hidden font-mono text-[10px] font-bold text-stone-400 sm:block">
              {PHASE_SHORT[room.phase] ?? ""}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000]">
            <div>
              <p className={`${BRUTAL.label} text-stone-500`}>RECHAZOS SEGUIDOS</p>
              <p className="font-mono text-sm font-black">
                {room.rejectionCount} / 3
              </p>
            </div>
            <div
              className="flex gap-0.5 text-base"
              aria-label={`${room.rejectionCount} de 3 comisiones rechazadas seguidas`}
            >
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={index < room.rejectionCount ? "text-[#ef4444]" : "text-stone-300"}
                >
                  ☠
                </span>
              ))}
            </div>
          </div>
        </div>

        {supabaseRealtime.configured && (
          <p className="mt-1 text-right font-mono text-[9px] font-bold uppercase tracking-wider text-stone-400">
            Realtime Supabase {supabaseRealtime.connected ? "● en vivo" : "○ conectando"}
          </p>
        )}
      </div>
    </header>
  );
}
