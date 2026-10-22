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

interface PixelAvatarProps {
  seed: string;
  isAi?: boolean;
  size?: number;
  className?: string;
}

/** Avatar pixel-art determinista: el mismo jugador se ve igual en toda la UI. */
export function PixelAvatar({ seed, isAi = false, size = 30, className }: PixelAvatarProps) {
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
        className={className}
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
      className={className}
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
