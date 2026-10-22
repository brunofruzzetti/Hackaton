import { useState } from "react";
import type { RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";
import { BRUTAL } from "../lib/ui";
import { PixelAvatar } from "./PixelAvatar";

interface PlayerCredentialProps {
  room: RuinaState;
  you: RuinaSelf;
  privateInfo: RuinaPrivateInfo;
}

export function PlayerCredential({ room, you, privateInfo }: PlayerCredentialProps) {
  const [open, setOpen] = useState(true);
  const playerIndex = room.players.findIndex((player) => player.id === you.playerId);
  const player = room.players[playerIndex];
  const dishonest = privateInfo.equipo === "DESHONESTOS";

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="hidden items-center justify-between gap-2 border-b-[3px] border-black bg-[#38bdf8] px-3 py-2 lg:flex">
        <div>
          <p className={`${BRUTAL.label} text-stone-800`}>CREDENCIAL DE PROPIETARIO</p>
          <p className="font-mono text-[10px] font-bold uppercase text-stone-700">
            Nº {room.code}-{String(Math.max(1, playerIndex + 1)).padStart(2, "0")} · VÁLIDA SOLO ESTA JUNTA
          </p>
        </div>
        <span className="shrink-0 rotate-6 border-2 border-black bg-white px-1.5 py-0.5 font-mono text-[9px] font-black uppercase">
          CONFIDENCIAL
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b-[3px] border-black bg-[#38bdf8] px-3 py-2 text-left transition-all active:translate-y-[1px] active:bg-[#7dd3fc] lg:hidden"
      >
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          🪪 Credencial de propietario · {player?.piso ?? "—"}
        </span>
        <span className="font-mono text-xs font-black">{open ? "OCULTAR ▲" : "MOSTRAR ▼"}</span>
      </button>

      <div className={open ? "block" : "hidden lg:block"}>
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-black bg-[#fef08a] shadow-[3px_3px_0_0_#000] lg:h-[72px] lg:w-[72px]">
              <PixelAvatar
                seed={you.playerId}
                size={40}
                className="h-auto w-10 lg:w-11"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`${BRUTAL.label} text-stone-500`}>VECINO DEL PISO</p>
              <p className="font-black uppercase leading-none tracking-tight">
                <span className="text-3xl">{player?.piso ?? "—"}</span>
              </p>
              <p className="mt-1 truncate font-mono text-sm font-bold uppercase">{you.nombre}</p>
            </div>
          </div>

          <div
            className={`mt-3 border-2 border-black px-2 py-1.5 shadow-[2px_2px_0_0_#000] ${
              dishonest ? "bg-[#ef4444] text-white" : "bg-[#22c55e] text-white"
            }`}
          >
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-80">
              TU BANDO SECRETO
            </p>
            <p className="text-sm font-black uppercase leading-tight">
              {dishonest ? "COMERCIAL INFILTRADO" : "VECINO HONESTO"}
            </p>
            <p className="font-mono text-[9px] font-bold uppercase opacity-90">
              {dishonest
                ? "No enseñes esta credencial. Tus compinches están abajo."
                : "Firma limpio y desconfía de las cláusulas raras."}
            </p>
          </div>

          {dishonest && privateInfo.companeros.length > 0 && (
            <div className="mt-3 border-2 border-black bg-red-100 px-2 py-1.5 font-mono text-[10px] font-bold text-red-900 shadow-[2px_2px_0_0_#000]">
              <span className="uppercase">Compinches:</span>{" "}
              {privateInfo.companeros.map((item) => `${item.nombre} (${item.piso})`).join(", ")}
            </div>
          )}

          <div className="relative mt-4 rotate-[-1deg] border-2 border-black bg-[#fef08a] p-3 shadow-[4px_4px_0_0_#000]">
            <span className="postit-pin" aria-hidden="true" />
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-stone-800">
                EXPEDIENTE DEL VECINO · {privateInfo.secreto.sobrePiso}
              </p>
              <span
                className={`shrink-0 border-2 border-black px-1 py-0.5 font-mono text-[9px] font-black uppercase ${
                  privateInfo.secreto.tipo === "SOSPECHOSO"
                    ? "bg-[#ef4444] text-white"
                    : privateInfo.secreto.tipo === "LIMPIO"
                      ? "bg-[#22c55e] text-white"
                      : "bg-amber-300 text-stone-900"
                }`}
              >
                {privateInfo.secreto.tipo.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs leading-snug text-stone-900">
              “{privateInfo.secreto.texto}”
            </p>
            <p className="mt-1 text-right font-mono text-[8px] font-bold uppercase text-stone-500">
              Informe no verificado · no enseñar
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
