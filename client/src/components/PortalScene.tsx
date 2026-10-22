import type { RuinaPlayerPublic, RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";
import { BRUTAL } from "../lib/ui";

const HAIRS = ["#2f1b12", "#111827", "#7c2d12", "#a16207", "#b91c1c", "#6b7280"];
const SHIRTS = ["#1d4ed8", "#15803d", "#b91c1c", "#7c3aed", "#0f766e", "#c2410c", "#ca8a04", "#475569"];
const SKINS = ["#f2c6a0", "#d9a066", "#b97a56", "#8d5524"];

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) >>> 0;
  }
  return value;
}

function PixelAvatar({ seed, isAi, size = 34 }: { seed: string; isAi: boolean; size?: number }) {
  const h = hash(seed);
  const hair = HAIRS[h % HAIRS.length] ?? HAIRS[0]!;
  const shirt = SHIRTS[(h >>> 3) % SHIRTS.length] ?? SHIRTS[0]!;
  const skin = SKINS[(h >>> 7) % SKINS.length] ?? SKINS[0]!;

  if (isAi) {
    return (
      <svg
        viewBox="0 0 16 24"
        width={size}
        height={size * 1.5}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="7" y="0" width="2" height="3" fill="#0f172a" />
        <rect x="7" y="0" width="2" height="1" fill="#38bdf8" />
        <rect x="3" y="3" width="10" height="7" fill="#cbd5e1" />
        <rect x="4" y="5" width="2" height="2" fill="#0ea5e9" />
        <rect x="10" y="5" width="2" height="2" fill="#0ea5e9" />
        <rect x="6" y="8" width="4" height="1" fill="#475569" />
        <rect x="4" y="10" width="8" height="6" fill="#475569" />
        <rect x="2" y="11" width="2" height="5" fill="#94a3b8" />
        <rect x="12" y="11" width="2" height="5" fill="#94a3b8" />
        <rect x="5" y="16" width="2" height="5" fill="#1e293b" />
        <rect x="9" y="16" width="2" height="5" fill="#1e293b" />
        <rect x="4" y="21" width="3" height="2" fill="#0f172a" />
        <rect x="9" y="21" width="3" height="2" fill="#0f172a" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 24"
      width={size}
      height={size * 1.5}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="4" y="0" width="8" height="3" fill={hair} />
      <rect x="3" y="3" width="10" height="5" fill={skin} />
      <rect x="4" y="2" width="8" height="2" fill={hair} />
      <rect x="5" y="5" width="1" height="1" fill="#111827" />
      <rect x="10" y="5" width="1" height="1" fill="#111827" />
      <rect x="7" y="7" width="2" height="1" fill="#9a3412" />
      <rect x="4" y="9" width="8" height="7" fill={shirt} />
      <rect x="2" y="10" width="2" height="6" fill={skin} />
      <rect x="12" y="10" width="2" height="6" fill={skin} />
      <rect x="5" y="16" width="2" height="5" fill="#1f2937" />
      <rect x="9" y="16" width="2" height="5" fill="#1f2937" />
      <rect x="4" y="21" width="3" height="2" fill="#111827" />
      <rect x="9" y="21" width="3" height="2" fill="#111827" />
    </svg>
  );
}

interface PortalSceneProps {
  room: RuinaState;
  you: RuinaSelf;
}

interface SeatPosition {
  left: number;
  top: number;
}

const LOBBY_SEATS: SeatPosition[] = [
  { left: 13, top: 31 },
  { left: 9, top: 57 },
  { left: 14, top: 81 },
  { left: 34, top: 20 },
  { left: 50, top: 14 },
  { left: 66, top: 20 },
  { left: 87, top: 31 },
  { left: 91, top: 57 },
];

const ASSEMBLY_SEATS: SeatPosition[] = [
  { left: 13, top: 33 },
  { left: 9, top: 60 },
  { left: 35, top: 20 },
  { left: 65, top: 20 },
  { left: 87, top: 33 },
  { left: 91, top: 60 },
  { left: 50, top: 13 },
];

interface SceneSeatProps {
  player: RuinaPlayerPublic;
  position: SeatPosition;
  isYou: boolean;
  role?: "PRESIDENTE" | "VOCAL";
  isTurn?: boolean;
  front?: boolean;
}

function SceneSeat({ player, position, isYou, role, isTurn, front }: SceneSeatProps) {
  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.left}%`, top: `${position.top}%` }}
    >
      <div
        className={`relative flex flex-col items-center ${isTurn ? "turn-pulse" : ""}`}
        aria-label={`${player.nombre}, piso ${player.piso}${role ? `, ${role}` : ""}`}
      >
        {role && (
          <span
            className={`absolute -top-2 z-30 -rotate-2 whitespace-nowrap border border-black px-1 py-0.5 font-mono text-[6px] font-black uppercase shadow-[1px_1px_0_0_#000] sm:text-[8px] ${
              role === "PRESIDENTE" ? "bg-[#fef08a]" : "bg-[#38bdf8]"
            }`}
          >
            {role === "PRESIDENTE" ? "🔑 PRESIDENTE" : "VOCAL"}
          </span>
        )}

        <div
          className={`relative flex h-[48px] w-[38px] items-end justify-center border-2 border-black bg-[#b8a78f] shadow-[2px_2px_0_0_#000] sm:h-[58px] sm:w-[46px] ${
            isYou ? "ring-[3px] ring-[#fef08a]" : ""
          } ${front ? "bg-[#fef08a]" : ""}`}
        >
          <div className="absolute inset-x-0 bottom-0 h-[7px] border-t-2 border-black bg-[#8b5e3c]" />
          <div className="absolute inset-x-1 top-0 h-[4px] border-b border-black/40 bg-[#d6c8b2]" />
          <div className="relative z-10 mb-[3px]">
            <PixelAvatar
              seed={player.id}
              isAi={player.isAi}
              size={front ? 28 : 24}
            />
          </div>
          <div className="absolute -bottom-[5px] left-1/2 h-[4px] w-[28px] -translate-x-1/2 border-x-2 border-black bg-[#6b4423]" />
        </div>

        <div className="mt-1 max-w-[56px] border border-black bg-[#fffdf7] px-1 py-0.5 text-center shadow-[1px_1px_0_0_#000] sm:max-w-[82px]">
          <p className="truncate font-mono text-[7px] font-black uppercase leading-tight sm:text-[9px]">
            {player.nombre}
          </p>
          <p className="font-mono text-[6px] font-bold uppercase leading-tight text-stone-500 sm:text-[7px]">
            {player.piso}
            {player.isAi ? " · IA" : ""}
            {isYou ? " · TÚ" : ""}
          </p>
        </div>
      </div>
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

  const positions = inLobby ? LOBBY_SEATS : ASSEMBLY_SEATS;

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="flex items-center justify-between border-b-[3px] border-black bg-[#d6c8b2] px-3 py-1.5">
        <div>
          <p className={`${BRUTAL.label} text-stone-600`}>PANORÁMICA DEL PORTAL · VISTA SUPERIOR</p>
          <h2 className="text-lg font-black uppercase leading-none tracking-tight">
            {inLobby ? "El portal espera" : "La asamblea en U"}
          </h2>
        </div>
        <span className="rotate-2 border-2 border-black bg-[#fef08a] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
          {inLobby ? "SIN ABRIR" : "EN SESIÓN"}
        </span>
      </div>

      <div className="relative aspect-[16/11] min-h-[230px] overflow-hidden bg-[#d6c8b2]">
        {/* Pared superior del portal */}
        <div className="absolute inset-x-0 top-0 h-[23%] border-b-[3px] border-black bg-[#9bb7c4]">
          <div className="absolute bottom-0 left-[4%] h-[82%] w-[9%] border-2 border-black bg-[#1e4b6b]">
            <span className="absolute right-1 top-1/2 h-1 w-1 rounded-full bg-[#fef08a]" />
            <span className="absolute inset-x-1 bottom-1 text-center font-mono text-[5px] font-black text-white">
              PORTAL
            </span>
          </div>
          <div className="absolute bottom-1 left-[23%] h-[65%] w-[28%] rotate-[-1deg] border-2 border-black bg-[#fef08a] p-1 shadow-[2px_2px_0_0_#000]">
            <div className="mx-auto h-[45%] w-[80%] border border-black bg-[#d6c8b2]" />
            <p className="text-center font-mono text-[5px] font-black uppercase">
              FOTO DE LA COMUNIDAD
            </p>
          </div>
          <div className="absolute bottom-1 left-[55%] h-[55%] w-[12%] border-2 border-black bg-[#fffdf7] p-1">
            <p className="text-center font-mono text-[5px] font-black uppercase">TABLÓN</p>
            <div className="mt-0.5 h-1 w-full bg-[#38bdf8]" />
            <div className="mt-0.5 h-1 w-2/3 bg-[#ef4444]" />
          </div>
          <div className="absolute bottom-0 right-[5%] h-[82%] w-[9%] border-2 border-black bg-[#1e4b6b]">
            <span className="absolute right-1 top-1/2 h-1 w-1 rounded-full bg-[#fef08a]" />
            <span className="absolute inset-x-1 bottom-1 text-center font-mono text-[5px] font-black text-white">
              GARAJE
            </span>
          </div>
        </div>

        {/* Suelo y alfombra central */}
        <div className="absolute inset-x-0 bottom-0 top-[23%] bg-[#f1e9dc]" />
        <div className="absolute left-1/2 top-[51%] h-[26%] w-[48%] -translate-x-1/2 -translate-y-1/2 border-2 border-[#8b5e3c] bg-[#c4a27a]">
          <div className="absolute inset-1 border border-dashed border-[#8b5e3c]/70" />
          <div className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 border-2 border-black bg-[#fffdf7] shadow-[2px_2px_0_0_#000]">
            <p className="mt-1 text-center font-mono text-[5px] font-black uppercase text-stone-500">
              MESA DE CAFÉ
            </p>
            <div className="mx-auto mt-0.5 h-1 w-3/4 bg-[#d6c8b2]" />
            <div className="mx-auto mt-0.5 h-1 w-1/2 bg-[#d6c8b2]" />
          </div>
        </div>

        {/* Mesa frontal / comisión */}
        {inLobby ? (
          <div className="absolute bottom-[7%] left-1/2 w-[46%] -translate-x-1/2 border-2 border-dashed border-black/50 bg-white/40 px-2 py-1.5 text-center font-mono text-[7px] font-bold uppercase text-stone-600">
            LA MESA FRONTAL SE ABRE AL EMPEZAR
          </div>
        ) : (
          <>
            <div className="absolute bottom-[7%] left-1/2 z-10 w-[43%] -translate-x-1/2 border-[3px] border-black bg-[#8b5e3c] p-1 shadow-[4px_4px_0_0_#000]">
              <div className="border-2 border-black bg-[#a16207] px-1 py-0.5 text-center">
                <p className="font-mono text-[6px] font-black uppercase text-[#fef08a]">
                  MESA FRONTAL · LLAVE DEL PORTAL
                </p>
              </div>
              <div className="mt-0.5 flex items-center justify-between px-1">
                <span className="text-[10px]">📄</span>
                <span className="h-1 w-1/3 bg-[#fef08a]" />
                <span className="text-[10px]">☕</span>
              </div>
            </div>
            {president && (
              <SceneSeat
                player={president}
                position={{ left: 43, top: 73 }}
                isYou={president.id === you.playerId}
                role="PRESIDENTE"
                isTurn={room.phase === "NOMINACION"}
                front
              />
            )}
            {vocal ? (
              <SceneSeat
                player={vocal}
                position={{ left: 57, top: 73 }}
                isYou={vocal.id === you.playerId}
                role="VOCAL"
                front
              />
            ) : (
              <div className="absolute left-[57%] top-[73%] z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-black/50 bg-white/50 px-1.5 py-1 text-center font-mono text-[6px] font-black uppercase text-stone-500">
                VOCAL
                <br />
                PENDIENTE
              </div>
            )}
          </>
        )}

        {seated.map((player, index) => {
          const position = positions[index % positions.length] ?? { left: 50, top: 50 };
          return (
            <SceneSeat
              key={player.id}
              player={player}
              position={position}
              isYou={player.id === you.playerId}
            />
          );
        })}

        <div className="absolute bottom-1 left-2 z-30 border border-black bg-white/80 px-1 py-0.5 font-mono text-[6px] font-black uppercase">
          U · {seated.length} sentados
          {inLobby ? "" : " + comisión"}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 border-t-2 border-black bg-[#fffdf7] px-2 py-1">
        <p className="font-mono text-[8px] font-bold uppercase text-stone-500">
          Sillas en U · presidencia al frente
        </p>
        <p className="font-mono text-[8px] font-bold uppercase text-stone-500">
          {inLobby ? "Todos esperando" : "La comisión ocupa la mesa"}
        </p>
      </div>
    </section>
  );
}
