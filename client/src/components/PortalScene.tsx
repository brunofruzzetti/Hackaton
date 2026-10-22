import { getEffectiveRole, type RoomState } from "@shared/index";
import { GUEST_SEATS, ROLE_VISUALS } from "../lib/roleVisuals";

interface PortalSceneProps {
  room: RoomState;
  speakingIds: Set<string>;
  countdown: string | null;
  judgeMessage: string | null;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

const PHASE_LABEL: Record<RoomState["phase"], string> = {
  LOBBY: "Lobby",
  ROLES: "Reparto",
  DISCUSSION: "Discusión",
  JUDGMENT: "Juicio",
  RESULTS_SHOP: "Resultados",
};

export function PortalScene({ room, speakingIds, countdown, judgeMessage }: PortalSceneProps) {
  const eventLines = room.currentEvent
    ? wrap(room.currentEvent.title, 26, 2)
    : wrap("Sin suceso activo", 26, 2);

  const seated = room.players.map((player, index) => {
    const visual = player.roleId ? ROLE_VISUALS[player.roleId] : null;
    const role = player.roleId
      ? getEffectiveRole(player.roleId, room.presidentStyleId)
      : null;
    const fallback = GUEST_SEATS[index % GUEST_SEATS.length] ?? GUEST_SEATS[0] ?? { x: 500, y: 400 };
    return {
      player,
      x: visual?.seat.x ?? fallback.x,
      y: visual?.seat.y ?? fallback.y,
      color: visual?.color ?? "#6b7280",
      emoji: visual?.emoji ?? "🧑",
      prop: visual?.prop ?? "",
      roleName: role?.name ?? "Vecino",
      speaking: speakingIds.has(player.id) && player.connected,
    };
  });

  return (
    <section className="portal-wrap" aria-label="Portal de la comunidad">
      <div className="portal-hud">
        <span className="portal-chip">Ronda {Math.max(room.round, 1)}/3</span>
        <span className="portal-chip portal-phase">{PHASE_LABEL[room.phase]}</span>
        {room.currentEvent && (
          <span className="portal-chip portal-event-chip">{room.currentEvent.title}</span>
        )}
        {countdown && <span className="portal-timer">{countdown}</span>}
      </div>

      <div className="portal-scroll">
        <svg
          className="portal-svg"
          viewBox="0 0 1000 640"
          role="img"
          aria-label={`Portal con ${seated.length} vecinos. Ronda ${room.round}.`}
        >
          <title>Portal de la comunidad con los vecinos sentados</title>
          <defs>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e7dcc8" />
              <stop offset="100%" stopColor="#d6c6ab" />
            </linearGradient>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c6b493" />
              <stop offset="100%" stopColor="#ac9978" />
            </linearGradient>
            <radialGradient id="lamp" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff7d6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Pared y suelo */}
          <rect width="1000" height="330" fill="url(#wall)" />
          <rect y="330" width="1000" height="310" fill="url(#floor)" />
          <rect y="322" width="1000" height="12" fill="#8d7c61" />
          <rect y="334" width="1000" height="4" fill="#efe4cf" opacity="0.5" />
          <ellipse cx="500" cy="20" rx="360" ry="220" fill="url(#lamp)" />

          {/* Puerta de entrada */}
          <rect x="24" y="92" width="104" height="238" rx="4" fill="#6b4f36" />
          <rect x="34" y="102" width="84" height="218" rx="3" fill="#8a6747" />
          <rect x="56" y="130" width="40" height="70" rx="3" fill="#5d442f" />
          <circle cx="108" cy="218" r="5" fill="#eab308" />
          <text x="76" y="80" textAnchor="middle" fill="#6b5b45" fontSize="12" fontWeight="700">
            PORTAL
          </text>

          {/* Buzones */}
          <g transform="translate(50, 170)">
            <rect width="112" height="108" rx="5" fill="#a8a29e" stroke="#78716c" />
            <text x="56" y="-8" textAnchor="middle" fill="#6b5b45" fontSize="11" fontWeight="700">
              BUZONES
            </text>
            {[0, 1, 2].map((row) =>
              [0, 1].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={8 + col * 50}
                  y={8 + row * 32}
                  width="44"
                  height="26"
                  rx="2"
                  fill="#d6d3d1"
                  stroke="#78716c"
                />
              )),
            )}
          </g>

          {/* Tablón de anuncios */}
          <g transform="translate(390, 48)">
            <rect width="250" height="176" rx="6" fill="#8a6747" />
            <rect x="7" y="7" width="236" height="162" rx="3" fill="#d8b98a" />
            <text x="125" y="28" textAnchor="middle" fill="#4b3621" fontSize="13" fontWeight="800">
              TABLÓN DE ANUNCIOS
            </text>
            <text x="125" y="48" textAnchor="middle" fill="#5c4327" fontSize="9">
              {truncate(room.proposal, 38)}
            </text>
            <line x1="18" y1="60" x2="232" y2="60" stroke="#b08d5d" />
            {eventLines.map((line, index) => (
              <text
                key={line}
                x="125"
                y={82 + index * 16}
                textAnchor="middle"
                fill="#7c2d12"
                fontSize="12"
                fontWeight="700"
              >
                {line}
              </text>
            ))}
            <rect x="18" y="122" width="214" height="30" rx="3" fill="#f4e5c8" stroke="#c2a16d" />
            <text x="125" y="142" textAnchor="middle" fill="#6b5b45" fontSize="9">
              {room.currentEvent ? "Suceso de la comunidad" : "Sin incidencias por ahora"}
            </text>
          </g>

          {/* Ascensor */}
          <g transform="translate(700, 58)">
            <rect width="130" height="220" rx="4" fill="#9ca3af" stroke="#6b7280" />
            <rect x="10" y="20" width="110" height="182" rx="2" fill="#6b7280" />
            <line x1="65" y1="20" x2="65" y2="202" stroke="#4b5563" strokeWidth="3" />
            <rect x="45" y="4" width="40" height="10" rx="2" fill="#111827" />
            <text x="65" y="12" textAnchor="middle" fill="#fbbf24" fontSize="8">
              {room.currentEvent ? "!" : "3"}
            </text>
            <text x="65" y="214" textAnchor="middle" fill="#e5e7eb" fontSize="9" fontWeight="700">
              ASCENSOR
            </text>
          </g>

          {/* Escaleras */}
          <g transform="translate(850, 90)">
            {[0, 1, 2, 3, 4].map((step) => (
              <rect
                key={step}
                x={step * 18}
                y={step * 32}
                width={110 - step * 10}
                height="20"
                fill={step % 2 === 0 ? "#a89a83" : "#998a72"}
              />
            ))}
            <text x="55" y="170" textAnchor="middle" fill="#6b5b45" fontSize="10" fontWeight="700">
              ESCALERAS
            </text>
          </g>

          {/* Plantas y bicis */}
          <g transform="translate(610, 300)">
            <ellipse cx="20" cy="36" rx="18" ry="7" fill="#7c5c3e" />
            <path d="M20 32 C-6 10 2 -18 20 -2 C38 -18 46 10 20 32Z" fill="#4d7c0f" />
            <ellipse cx="90" cy="38" rx="24" ry="6" fill="#57534e" />
            <circle cx="72" cy="30" r="14" fill="none" stroke="#374151" strokeWidth="3" />
            <circle cx="108" cy="30" r="14" fill="none" stroke="#374151" strokeWidth="3" />
            <path d="M72 30 L90 12 L108 30 M90 12 L90 30" fill="none" stroke="#374151" strokeWidth="3" />
          </g>

          {/* Mesa presidencial */}
          <g className="president-table">
            <ellipse cx="255" cy="310" rx="140" ry="48" fill="#8a5a35" />
            <ellipse cx="255" cy="302" rx="140" ry="42" fill="#b07c4f" />
            <rect x="125" y="330" width="10" height="38" fill="#6b4423" />
            <rect x="375" y="330" width="10" height="38" fill="#6b4423" />
            <text x="255" y="306" textAnchor="middle" fill="#5b3a1e" fontSize="10" fontWeight="700">
              MESA DE LA JUNTA
            </text>
          </g>

          {/* Altavoz del juez */}
          <g className="pa-speaker" data-active={judgeMessage ? "true" : "false"}>
            <rect x="462" y="14" width="76" height="34" rx="6" fill="#374151" />
            <circle cx="480" cy="31" r="5" fill={judgeMessage ? "#ef4444" : "#9ca3af"} />
            <path d="M494 22 L516 16 L516 46 L494 40Z" fill="#6b7280" />
            {judgeMessage && <circle cx="516" cy="31" r="16" fill="#ef4444" opacity="0.18" />}
            <text x="500" y="60" textAnchor="middle" fill="#6b5b45" fontSize="8" fontWeight="700">
              MEGAFONÍA
            </text>
          </g>

          {/* Vecinos */}
          {seated.map(({ player, x, y, color, emoji, prop, roleName, speaking }) => (
            <g
              key={player.id}
              transform={`translate(${x}, ${y})`}
              className={`portal-seat ${speaking ? "speaking" : ""} ${
                player.connected ? "" : "offline"
              }`}
            >
              <title>{`${player.name} · ${roleName}`}</title>
              <rect x="-35" y="20" width="70" height="15" rx="6" fill="#5f4d36" />
              {speaking && (
                <circle className="speaking-ring" r="43" fill="none" stroke="#22c55e" strokeWidth="5" />
              )}
              <circle
                className="portal-avatar"
                r="34"
                fill={color}
                stroke="#fffdf7"
                strokeWidth="4"
              />
              <text y="12" textAnchor="middle" fontSize="32">
                {emoji}
              </text>
              {prop && prop !== emoji && (
                <text x="27" y="-23" textAnchor="middle" fontSize="15">
                  {prop}
                </text>
              )}
              {player.kind === "ai" && (
                <g transform="translate(20, -34)">
                  <rect x="-2" y="-9" width="24" height="15" rx="4" fill="#ede9fe" stroke="#6d28d9" />
                  <text x="10" y="2" textAnchor="middle" fill="#5b21b6" fontSize="9" fontWeight="800">
                    IA
                  </text>
                </g>
              )}
              {!player.connected && (
                <circle r="34" fill="#111827" opacity="0.55" />
              )}
              <text
                y="55"
                textAnchor="middle"
                fill="#1f2937"
                fontSize="20"
                fontWeight="800"
              >
                {truncate(player.name, 13)}
              </text>
              <text
                className="portal-role-label"
                y="69"
                textAnchor="middle"
                fill="#4b5563"
                fontSize="11"
              >
                {truncate(roleName, 20)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="portal-caption">
        <span>Portal de la comunidad · 3.º B</span>
        <span>Los nombres completos están en la lista de vecinos</span>
      </div>
    </section>
  );
}
