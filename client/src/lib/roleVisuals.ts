import type { RoleId } from "@shared/index";

export interface RoleVisual {
  color: string;
  emoji: string;
  /** Coordenadas del asiento en el viewBox 1000x640. */
  seat: { x: number; y: number };
  /** Objeto que identifica visualmente al rol. */
  prop: string;
}

export const ROLE_VISUALS: Record<RoleId, RoleVisual> = {
  president: { color: "#b45309", emoji: "🎩", seat: { x: 180, y: 245 }, prop: "📜" },
  concierge: { color: "#0f766e", emoji: "🔑", seat: { x: 330, y: 245 }, prop: "🔑" },
  tenant: { color: "#0e7490", emoji: "📦", seat: { x: 455, y: 225 }, prop: "📦" },
  remote: { color: "#4338ca", emoji: "💻", seat: { x: 575, y: 225 }, prop: "💻" },
  eco: { color: "#15803d", emoji: "🚲", seat: { x: 690, y: 225 }, prop: "🚲" },
  expresident: { color: "#9f1239", emoji: "🏅", seat: { x: 815, y: 225 }, prop: "🏅" },
  gossip: { color: "#be123c", emoji: "👀", seat: { x: 90, y: 500 }, prop: "👀" },
  debtor: { color: "#7c3aed", emoji: "💸", seat: { x: 205, y: 500 }, prop: "✉️" },
  spender: { color: "#c2410c", emoji: "🧾", seat: { x: 320, y: 500 }, prop: "🧾" },
  clueless: { color: "#0369a1", emoji: "❓", seat: { x: 435, y: 500 }, prop: "❓" },
  squatter: { color: "#4d7c0f", emoji: "🚪", seat: { x: 550, y: 500 }, prop: "🚪" },
  catlady: { color: "#a21caf", emoji: "🐈", seat: { x: 665, y: 500 }, prop: "🐈" },
  inlaw: { color: "#ca8a04", emoji: "🗣️", seat: { x: 780, y: 500 }, prop: "🗣️" },
  handyman: { color: "#475569", emoji: "🔧", seat: { x: 895, y: 500 }, prop: "🔧" },
};

/** Asientos provisionales para el lobby, antes de repartir roles. */
export const GUEST_SEATS: Array<{ x: number; y: number }> = [
  { x: 180, y: 245 },
  { x: 330, y: 245 },
  { x: 455, y: 225 },
  { x: 575, y: 225 },
  { x: 690, y: 225 },
  { x: 815, y: 225 },
  { x: 90, y: 500 },
  { x: 205, y: 500 },
  { x: 320, y: 500 },
  { x: 435, y: 500 },
];
