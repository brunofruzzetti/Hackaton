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

function PixelAvatar({ seed, isAi, size = 30 }: { seed: string; isAi: boolean; size?: number }) {
  const h = hash(seed);
  const hair = HAIRS[h % HAIRS.length] ?? HAIRS[0]!;
  const shirt = SHIRTS[(h >>> 3) % SHIRTS.length] ?? SHIRTS[0]!;
  const skin = SKINS[(h >>> 7) % SKINS.length] ?? SKINS[0]!;

  if (isAi) {
    return (
      <svg viewBox="0 0 16 24" width={size} height={size * 1.5} shapeRendering="crispEdges" aria-hidden="true">
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
    <svg viewBox="0 0 16 24" width={size} height={size * 1.5} shapeRendering="crispEdges" aria-hidden="true">
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

/**
 * Posiciones simétricas para una U abierta hacia la mesa frontal. Si hay
 * pocos jugadores se concentran arriba/centro; si hay muchos, bajan por los
 * laterales. Todas las filas están centradas respecto al 50 %.
 */
const U_SEATS: Record<number, SeatPosition[]> = {
  1: [{ left: 50, top: 28 }],
  2: [{ left: 39, top: 27 }, { left: 61, top: 27 }],
  3: [{ left: 24, top: 34 }, { left: 50, top: 28 }, { left: 76, top: 34 }],
  4: [{ left: 17, top: 41 }, { left: 37, top: 28 }, { left: 63, top: 28 }, { left: 83, top: 41 }],
  5: [{ left: 14, top: 49 }, { left: 17, top: 32 }, { left: 50, top: 28 }, { left: 83, top: 32 }, { left: 86, top: 49 }],
  6: [{ left: 13, top: 54 }, { left: 10, top: 35 }, { left: 34, top: 28 }, { left: 66, top: 28 }, { left: 90, top: 35 }, { left: 87, top: 54 }],
  7: [{ left: 13, top: 58 }, { left: 9, top: 39 }, { left: 29, top: 29 }, { left: 50, top: 27 }, { left: 71, top: 29 }, { left: 91, top: 39 }, { left: 87, top: 58 }],
  8: [{ left: 13, top: 60 }, { left: 9, top: 43 }, { left: 13, top: 31 }, { left: 36, top: 28 }, { left: 64, top: 28 }, { left: 87, top: 31 }, { left: 91, top: 43 }, { left: 87, top: 60 }],
};

function uSeats(count: number): SeatPosition[] {
  return U_SEATS[Math.max(0, Math.min(8, count))] ?? [];
}

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
            className="absolute -top-2 z-30 border border-black bg-[#fef08a] px-1 py-0.5 text-[8px] leading-none shadow-[1px_1px_0_0_#000]"
            aria-hidden="true"
          >
            {role === "PRESIDENTE" ? "🔑" : "📄"}
          </span>
        )}

        <div
          className={`relative flex h-[37px] w-[29px] items-end justify-center border-2 border-black bg-[#b8a78f] shadow-[2px_2px_0_0_#000] sm:h-[43px] sm:w-[34px] ${
            isYou ? "ring-[3px] ring-[#fef08a]" : ""
          } ${front ? "bg-[#fef08a]" : ""}`}
        >
          <div className="absolute inset-x-0 bottom-0 h-[6px] border-t-2 border-black bg-[#8b5e3c]" />
          <div className="absolute inset-x-1 top-0 h-[3px] border-b border-black/40 bg-[#d6c8b2]" />
          <div className="relative z-10 mb-[2px]">
            <PixelAvatar seed={player.id} isAi={player.isAi} size={front ? 22 : 19} />
          </div>
          <div className="absolute -bottom-[4px] left-1/2 h-[3px] w-[22px] -translate-x-1/2 border-x-2 border-black bg-[#6b4423]" />
        </div>

        <div className="mt-0.5 max-w-[48px] border border-black bg-[#fffdf7] px-0.5 py-0.5 text-center shadow-[1px_1px_0_0_#000] sm:max-w-[58px]">
          <p className="truncate font-mono text-[6px] font-black uppercase leading-tight sm:text-[7px]">
            {player.nombre}
          </p>
          <p className="font-mono text-[5px] font-bold uppercase leading-tight text-stone-500 sm:text-[6px]">
            {player.piso}
            {player.isAi ? " 🤖" : ""}
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
    : room.players.filter((player) => player.id !== president?.id && player.id !== vocal?.id);
  const positions = uSeats(seated.length);

  return (
    <section className={`${BRUTAL.cardLg} overflow-hidden`}>
      <div className="flex items-center justify-between border-b-[3px] border-black bg-[#d6c8b2] px-3 py-1.5">
        <h2 className="text-lg font-black uppercase leading-none tracking-tight">JUNTA URGENTE</h2>
        <span className="text-lg" aria-hidden="true">
          🏢
        </span>
      </div>

      <div className="relative aspect-[4/3] min-h-[250px] overflow-hidden bg-[#d6c8b2]">
        {/* Pared del portal, sin rótulos */}
        <div className="absolute inset-x-0 top-0 h-[24%] border-b-[3px] border-black bg-[#9bb7c4]">
          <div className="absolute bottom-0 left-[3%] h-[80%] w-[8%] border-2 border-black bg-[#1e4b6b]">
            <span className="absolute right-1 top-1/2 h-1 w-1 rounded-full bg-[#fef08a]" />
          </div>
          <div className="absolute bottom-0 right-[3%] h-[80%] w-[8%] border-2 border-black bg-[#1e4b6b]">
            <span className="absolute right-1 top-1/2 h-1 w-1 rounded-full bg-[#fef08a]" />
          </div>

          {/* Tablón de la derrama: papeles, chinchetas y visual, sin texto */}
          <div className="absolute left-[36%] top-[3%] h-[88%] w-[28%] border-2 border-black bg-[#b8865a] p-1 shadow-[2px_2px_0_0_#000]">
            <div className="grid h-full grid-cols-2 gap-0.5">
              <div className="border border-black bg-[#fffdf7] p-0.5">
                <div className="h-1 w-3/4 bg-stone-300" />
                <div className="mt-0.5 h-1 w-full bg-stone-300" />
                <div className="mt-0.5 h-1 w-2/3 bg-red-300" />
              </div>
              <div className="border border-black bg-[#fef08a] p-0.5">
                <div className="h-1 w-2/3 bg-stone-400" />
                <div className="mt-0.5 h-1 w-full bg-stone-300" />
                <div className="mt-0.5 h-1 w-3/4 bg-stone-300" />
              </div>
              <div className="col-span-2 border border-black bg-[#fffdf7] p-0.5">
                <div className="flex items-center justify-between">
                  <div className="h-1 w-1/2 bg-stone-300" />
                  <span className="text-[7px] leading-none">🪙</span>
                </div>
                <div className="mt-0.5 h-1 w-3/4 bg-red-300" />
              </div>
            </div>
            <span className="absolute -top-1 left-1 h-1 w-1 rounded-full bg-red-600" />
            <span className="absolute -top-1 right-2 h-1 w-1 rounded-full bg-blue-600" />
          </div>
        </div>

        {/* Suelo */}
        <div className="absolute inset-x-0 bottom-0 top-[24%] bg-[#f1e9dc]" />

        {/* Mesa de café grande, sin rótulos; más ancha que la mesa de la comisión */}
        <div className="absolute left-1/2 top-[49%] h-[16%] w-[56%] -translate-x-1/2 -translate-y-1/2 border-[3px] border-black bg-[#fffdf7] shadow-[4px_4px_0_0_#000]">
          <div className="absolute inset-1 border border-stone-300" />
          <div className="absolute left-[14%] top-[22%] h-[28%] w-[18%] rounded-full border-2 border-black bg-[#e7dfd2]" />
          <div className="absolute right-[16%] top-[30%] h-[22%] w-[14%] rounded-full border-2 border-black bg-[#e7dfd2]" />
          <div className="absolute left-[42%] top-[25%] h-[38%] w-[18%] rotate-2 border border-black bg-[#fef08a]">
            <div className="mt-1 h-0.5 w-2/3 bg-stone-300" />
            <div className="mt-0.5 h-0.5 w-1/2 bg-stone-300" />
          </div>
        </div>

        {/* Mesa frontal pequeña para la comisión */}
        {inLobby ? (
          <div className="absolute bottom-[7%] left-1/2 h-[10%] w-[30%] -translate-x-1/2 border-2 border-dashed border-black/40 bg-white/30" />
        ) : (
          <>
            <div className="absolute bottom-[7%] left-1/2 h-[8%] w-[29%] -translate-x-1/2 border-[3px] border-black bg-[#8b5e3c] p-1 shadow-[3px_3px_0_0_#000]">
              <div className="flex h-full items-center justify-between border border-black bg-[#a16207] px-1">
                <span className="h-1 w-1/3 bg-[#fef08a]" />
                <span className="text-[8px]">📄</span>
                <span className="h-1 w-1/4 bg-[#fef08a]" />
              </div>
            </div>
            {president && (
              <SceneSeat
                player={president}
                position={{ left: 43, top: 75 }}
                isYou={president.id === you.playerId}
                role="PRESIDENTE"
                isTurn={room.phase === "NOMINACION"}
                front
              />
            )}
            {vocal ? (
              <SceneSeat
                player={vocal}
                position={{ left: 57, top: 75 }}
                isYou={vocal.id === you.playerId}
                role="VOCAL"
                front
              />
            ) : (
              <div className="absolute left-[57%] top-[75%] z-10 h-[37px] w-[29px] -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-black/50 bg-white/40" />
            )}
          </>
        )}

        {seated.map((player, index) => {
          const position = positions[index] ?? { left: 50, top: 50 };
          return (
            <SceneSeat
              key={player.id}
              player={player}
              position={position}
              isYou={player.id === you.playerId}
            />
          );
        })}
      </div>
    </section>
  );
}
