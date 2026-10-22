import { describe, expect, it } from "vitest";
import { ROLE_IDS, PRESIDENT_STYLE_IDS } from "./roles.js";
import {
  assignComboTask,
  buildTaskDeck,
  drawTaskHand,
  type PlayerTask,
} from "./tasks.js";

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("mazos de tareas", () => {
  it("cada rol tiene 24 tareas con ids únicos", () => {
    for (const roleId of ROLE_IDS) {
      const deck = buildTaskDeck(roleId, roleId === "president" ? "reluctant" : null);
      expect(deck).toHaveLength(24);
      expect(new Set(deck.map((task) => task.id)).size).toBe(24);
      expect(deck.every((task) => task.text.length > 10)).toBe(true);
      expect(deck.every((task) => task.roleId === roleId)).toBe(true);
    }
  });

  it("el presidente cambia de mazo según su estilo", () => {
    const decks = PRESIDENT_STYLE_IDS.map((style) =>
      buildTaskDeck("president", style).map((task) => task.text).join("|"),
    );
    expect(new Set(decks).size).toBe(3);
    const reluctant = buildTaskDeck("president", "reluctant");
    expect(reluctant.some((task) => task.source === "style")).toBe(true);
  });

  it("reparte 4 tareas: fácil, 2 medias y difícil", () => {
    const deck = buildTaskDeck("gossip");
    for (let seed = 1; seed <= 100; seed += 1) {
      const hand = drawTaskHand(deck, seededRng(seed));
      expect(hand).toHaveLength(4);
      expect(new Set(hand.map((task) => task.id)).size).toBe(4);
      expect(hand.filter((task) => task.difficulty === "easy")).toHaveLength(1);
      expect(hand.filter((task) => task.difficulty === "medium")).toHaveLength(2);
      expect(hand.filter((task) => task.difficulty === "hard")).toHaveLength(1);
      expect(hand.filter((task) => task.source !== "universal")).toHaveLength(3);
      expect(hand.filter((task) => task.source === "universal")).toHaveLength(1);
    }
  });

  it("no repite tareas entre rondas cuando se excluyen las usadas", () => {
    const deck = buildTaskDeck("debtor");
    const used = new Set<string>();
    const seen = new Set<string>();
    for (let round = 0; round < 3; round += 1) {
      const hand = drawTaskHand(deck, seededRng(round + 1), used);
      for (const task of hand) {
        expect(used.has(task.id)).toBe(false);
        used.add(task.id);
        seen.add(task.id);
      }
      expect(hand).toHaveLength(4);
    }
    expect(seen.size).toBe(12);
  });

  it("asigna una tarea combo a ambos participantes", () => {
    const players = [
      { id: "h1", name: "Ana", roleId: "gossip" as const },
      { id: "h2", name: "Beto", roleId: "squatter" as const },
    ];
    const hands = new Map<string, PlayerTask[]>([
      ["h1", drawTaskHand(buildTaskDeck("gossip"), seededRng(1))],
      ["h2", drawTaskHand(buildTaskDeck("squatter"), seededRng(2))],
    ]);

    const combo = assignComboTask(hands, players, seededRng(3));
    expect(combo).not.toBeNull();
    expect(combo?.combo.roleA).toBe("gossip");
    expect(combo?.combo.roleB).toBe("squatter");

    const anaCombo = hands.get("h1")?.find((task) => task.kind === "combo");
    const betoCombo = hands.get("h2")?.find((task) => task.kind === "combo");
    expect(anaCombo?.partnerName).toBe("Beto");
    expect(betoCombo?.partnerName).toBe("Ana");
    expect(anaCombo?.text).toContain("Combo con Beto");
    expect(betoCombo?.text).toContain("Combo con Ana");
    expect(hands.get("h1")).toHaveLength(4);
    expect(hands.get("h2")).toHaveLength(4);
  });

  it("no asigna combo si no hay pareja de roles compatible", () => {
    const players = [
      { id: "h1", name: "Ana", roleId: "gossip" as const },
      { id: "h2", name: "Beto", roleId: "clueless" as const },
    ];
    const hands = new Map<string, PlayerTask[]>([
      ["h1", drawTaskHand(buildTaskDeck("gossip"))],
      ["h2", drawTaskHand(buildTaskDeck("clueless"))],
    ]);
    expect(assignComboTask(hands, players)).toBeNull();
  });
});
