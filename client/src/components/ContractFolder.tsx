import { RUINA_MAX_REJECTIONS, type RuinaState } from "@shared/index";
import { BRUTAL } from "../lib/ui";

interface ContractFolderProps {
  room: RuinaState;
}

export function ContractFolder({ room }: ContractFolderProps) {
  const president = room.players.find((player) => player.id === room.presidentId);
  const vocal = room.players.find((player) => player.id === room.vocalId);

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="flex items-center justify-between border-b-[3px] border-black bg-[#38bdf8] px-3 py-1.5">
        <p className={`${BRUTAL.label} text-stone-900`}>EXPEDIENTE DE OBRA · RONDA {room.round}</p>
        <span className="rotate-2 border-2 border-black bg-white px-1.5 py-0.5 font-mono text-[9px] font-black uppercase">
          ORDEN DEL DÍA
        </span>
      </div>
      <div className="p-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
          CONTRATO PROPUESTO POR LA CONSTRUCTORA
        </p>
        <h2 className="mt-1 text-lg font-black uppercase leading-tight tracking-tight">
          {room.contract.titulo}
        </h2>
        <p className="mt-1 font-mono text-xs leading-relaxed text-stone-700">
          {room.contract.descripcion}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border-2 border-black bg-[#fef08a] px-2 py-1.5 shadow-[2px_2px_0_0_#000]">
            <p className={`${BRUTAL.label} text-stone-600`}>🔑 PRESIDENTE</p>
            <p className="truncate text-sm font-black uppercase">{president?.nombre ?? "—"}</p>
          </div>
          <div className="border-2 border-black bg-white px-2 py-1.5 shadow-[2px_2px_0_0_#000]">
            <p className={`${BRUTAL.label} text-stone-500`}>🪪 VOCAL</p>
            <p className="truncate text-sm font-black uppercase">{vocal?.nombre ?? "SIN NOMINAR"}</p>
          </div>
        </div>

        {room.rejectionCount > 0 && (
          <p className="mt-2 border-2 border-black bg-[#ef4444] px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-white shadow-[2px_2px_0_0_#000]">
            ☠ {room.rejectionCount}/{RUINA_MAX_REJECTIONS} comisiones rechazadas. A la segunda, la
            constructora derrumba el edificio.
          </p>
        )}
      </div>
    </section>
  );
}
