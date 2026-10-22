import type { RuinaPlayerPublic, RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";
import { BRUTAL } from "../lib/ui";

const AVATARS = ["🧑‍🦱", "👩‍🦰", "🧔", "👵", "👨‍🦲", "👩‍🦳", "🧑‍🎤", "👴"];

interface PortalSceneProps {
  room: RuinaState;
  you: RuinaSelf;
}

interface SceneSeatProps {
  player: RuinaPlayerPublic | null;
  role?: "PRESIDENTE" | "VOCAL";
  isYou?: boolean;
  emptyLabel?: string;
  front?: boolean;
}

function SceneSeat({ player, role, isYou, emptyLabel, front }: SceneSeatProps) {
  if (!player) {
    return (
      <div className="scene-chair flex min-h-[58px] items-center justify-center border-2 border-dashed border-black/50 bg-white/40 px-2 text-center font-mono text-[9px] font-bold uppercase text-stone-500">
        {emptyLabel ?? "SILLA VACÍA"}
      </div>
    );
  }

  const playerIndex = Number(player.id.replace(/\D/g, "")) || 0;
  const avatar = AVATARS[playerIndex % AVATARS.length] ?? "🧑";

  return (
    <div
      className={`scene-seat relative flex min-h-[58px] items-center gap-2 border-2 border-black px-2 py-1.5 shadow-[2px_2px_0_0_#000] ${
        isYou ? "ring-[3px] ring-[#fef08a] ring-offset-1 ring-offset-[#e7dfd2]" : ""
      } ${front ? "scene-table-seat bg-[#fffdf7]" : "scene-chair bg-white"}`}
    >
      <span className={`text-2xl ${player.isAi ? "grayscale" : ""}`} aria-hidden="true">
        {player.isAi ? "🤖" : avatar}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black uppercase leading-tight">{player.nombre}</p>
        <p className="font-mono text-[9px] font-bold uppercase text-stone-500">
          {player.piso}
          {player.isHost ? " · ANFITRIÓN" : ""}
          {player.isAi ? " · IA" : ""}
          {isYou ? " · TÚ" : ""}
        </p>
      </div>
      {role && (
        <span
          className={`absolute -right-1.5 -top-2 rotate-2 border border-black px-1 py-0.5 font-mono text-[8px] font-black uppercase ${
            role === "PRESIDENTE" ? "bg-[#fef08a]" : "bg-[#38bdf8]"
          }`}
        >
          {role}
        </span>
      )}
    </div>
  );
}

export function PortalScene({ room, you }: PortalSceneProps) {
  const inLobby = room.phase === "LOBBY";
  const president = inLobby
    ? null
    : (room.players.find((player) => player.id === room.presidentId) ?? null);
  const vocal = inLobby
    ? null
    : (room.players.find((player) => player.id === room.vocalId) ?? null);
  const seated = inLobby
    ? room.players
    : room.players.filter(
        (player) => player.id !== president?.id && player.id !== vocal?.id,
      );

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="flex items-center justify-between border-b-[3px] border-black bg-[#d6c8b2] px-3 py-1.5">
        <div>
          <p className={`${BRUTAL.label} text-stone-600`}>ESCENA DEL PORTAL</p>
          <h2 className="text-lg font-black uppercase leading-none tracking-tight">
            {inLobby ? "Portal 3.º B · esperando" : "La asamblea está sentada"}
          </h2>
        </div>
        <span className="rotate-2 border-2 border-black bg-[#fef08a] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
          {inLobby ? "SIN ABRIR" : "EN SESIÓN"}
        </span>
      </div>

      <div className="scene-floor relative p-3">
        {/* Pared del portal */}
        <div className="relative mb-3 h-20 overflow-hidden border-2 border-black bg-[#d6c8b2] shadow-[3px_3px_0_0_#000]">
          <div className="absolute bottom-0 left-2 h-16 w-12 border-2 border-black bg-[#7c5c3e]">
            <div className="absolute left-1 top-7 h-1 w-1 rounded-full bg-[#fef08a]" />
            <p className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[7px] font-black text-[#fef08a]">
              PORTAL
            </p>
          </div>
          <div className="absolute bottom-2 left-1/2 h-11 w-28 -translate-x-1/2 rotate-[-1deg] border-2 border-black bg-[#fef08a] p-1 shadow-[2px_2px_0_0_#000]">
            <p className="text-center font-mono text-[7px] font-black uppercase">
              TABLÓN DE ANUNCIOS
            </p>
            <p className="text-center font-mono text-[6px] uppercase text-stone-600">
              “No tirar basura. No colar sabotajes.”
            </p>
          </div>
          <div className="absolute bottom-2 right-2 h-11 w-10 border-2 border-black bg-[#fffdf7] p-1">
            <div className="mx-auto h-2 w-2 rounded-full border border-black bg-[#ef4444]" />
            <p className="mt-1 text-center font-mono text-[6px] font-black uppercase">BUZÓN</p>
          </div>
          <div className="absolute left-1/2 top-0 h-2 w-16 -translate-x-1/2 bg-[#b8a78f]" />
        </div>

        {inLobby ? (
          <div className="mb-3 border-2 border-dashed border-black bg-white/60 px-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase text-stone-600">
            La mesa frontal se abre cuando empiece la junta
          </div>
        ) : (
          <div className="relative mb-3 border-[3px] border-black bg-[#fffdf7] p-2 pt-4 shadow-[3px_3px_0_0_#000]">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-1 border-2 border-black bg-[#fef08a] px-2 py-0.5 font-mono text-[8px] font-black uppercase">
              MESA FRONTAL · LLAVE DEL PORTAL
            </span>
            <div className="grid grid-cols-2 gap-2">
              <SceneSeat player={president} role="PRESIDENTE" isYou={president?.id === you.playerId} front />
              <SceneSeat
                player={vocal}
                role={vocal ? "VOCAL" : undefined}
                isYou={vocal?.id === you.playerId}
                emptyLabel="VOCAL PENDIENTE"
                front
              />
            </div>
          </div>
        )}

        <div className="mb-1 flex items-center justify-between">
          <p className={`${BRUTAL.label} text-stone-500`}>
            {inLobby ? "VECINOS EN EL PORTAL" : "SILLAS DE LA ASAMBLEA"}
          </p>
          <span className="font-mono text-[9px] font-bold text-stone-500">
            {seated.length} {seated.length === 1 ? "VECINO" : "VECINOS"}
          </span>
        </div>
        <div className={`grid gap-2 ${inLobby ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
          {seated.map((player) => (
            <SceneSeat
              key={player.id}
              player={player}
              isYou={player.id === you.playerId}
            />
          ))}
          {seated.length === 0 && (
            <p className="col-span-full border-2 border-dashed border-black/50 bg-white/40 px-2 py-2 text-center font-mono text-[10px] uppercase text-stone-500">
              No queda nadie en las sillas: la comisión está en la mesa.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
