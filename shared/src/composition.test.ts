import { describe, expect, it } from "vitest";
import {
  assignRoles,
  ensureConciergePresident,
  pickPresidentStyle,
  planComposition,
  type ParticipantSeed,
  type Rng,
} from "./composition.js";
import { PRESIDENT_STYLE_IDS, ROLE_IDS, type RoleId } from "./roles.js";

/** RNG determinista para tests (mulberry32). */
function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticipants(humans: number, ai: number): ParticipantSeed[] {
  const participants: ParticipantSeed[] = [];
  for (let i = 0; i < humans; i += 1) {
    participants.push({ id: `h${i}`, name: `Humano ${i}`, kind: "human" });
  }
  for (let i = 0; i < ai; i += 1) {
    participants.push({ id: `a${i}`, name: `IA ${i}`, kind: "ai" });
  }
  return participants;
}

function assertRule(roleIds: readonly RoleId[]): void {
  if (roleIds.includes("concierge")) {
    if (!roleIds.includes("president")) {
      throw new Error(`Conserje sin presidente: ${roleIds.join(", ")}`);
    }
  }
  if (new Set(roleIds).size !== roleIds.length) {
    throw new Error(`Roles repetidos: ${roleIds.join(", ")}`);
  }
}

describe("ensureConciergePresident", () => {
  it("fuerza el presidente sustituyendo un rol que no es el conserje", () => {
    const rng = seededRng(7);
    const result = ensureConciergePresident(["concierge", "gossip", "debtor"], rng);
    expect(result).toHaveLength(3);
    expect(result).toContain("concierge");
    expect(result).toContain("president");
    expect(result.filter((role) => role === "gossip" || role === "debtor")).toHaveLength(1);
    assertRule(result);
  });

  it("no toca el conjunto si ya hay presidente", () => {
    const result = ensureConciergePresident(["concierge", "president", "gossip"], seededRng(1));
    expect(result).toEqual(["concierge", "president", "gossip"]);
  });

  it("no toca el conjunto si no hay conserje", () => {
    const result = ensureConciergePresident(["gossip", "debtor", "spender"], seededRng(1));
    expect(result).toEqual(["gossip", "debtor", "spender"]);
  });

  it("si solo cabe el conserje, lo descarta y sortea otro rol", () => {
    const result = ensureConciergePresident(["concierge"], seededRng(3));
    expect(result).toHaveLength(1);
    expect(result).not.toContain("concierge");
    expect(ROLE_IDS).toContain(result[0]);
  });
});

describe("planComposition", () => {
  it("acepta 3 humanos", () => {
    const plan = planComposition({ humans: 3, ai: 0 });
    expect(plan.ok).toBe(true);
    expect(plan.aiToAdd).toBe(0);
  });

  it("rellena con IA hasta el mínimo cuando hay 1 humano", () => {
    const plan = planComposition({ humans: 1, ai: 0 });
    expect(plan.ok).toBe(true);
    expect(plan.aiToAdd).toBe(2);
    expect(plan.finalTotal).toBe(3);
  });

  it("permite 1 humano + 4 IA (máximo de IA)", () => {
    const plan = planComposition({ humans: 1, ai: 4 });
    expect(plan.ok).toBe(true);
    expect(plan.aiToAdd).toBe(0);
    expect(plan.finalTotal).toBe(5);
  });

  it("rechaza una partida sin humanos", () => {
    const plan = planComposition({ humans: 0, ai: 4 });
    expect(plan.ok).toBe(false);
    expect(plan.errors.join(" ")).toMatch(/humano/i);
  });

  it("acepta 10 participantes (6 humanos + 4 IA)", () => {
    const plan = planComposition({ humans: 6, ai: 4 });
    expect(plan.ok).toBe(true);
    expect(plan.finalTotal).toBe(10);
  });

  it("rechaza más de 10 participantes", () => {
    const plan = planComposition({ humans: 7, ai: 4 });
    expect(plan.ok).toBe(false);
  });

  it("rechaza más de 4 IA", () => {
    const plan = planComposition({ humans: 3, ai: 5 });
    expect(plan.ok).toBe(false);
  });
});

describe("pickPresidentStyle", () => {
  it("siempre devuelve uno de los tres estilos", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const style = pickPresidentStyle(seededRng(seed));
      expect(PRESIDENT_STYLE_IDS).toContain(style);
    }
  });
});

describe("assignRoles · regla conserje ⇒ presidente", () => {
  it("con 3 participantes reparte 3 roles únicos y cumple la regla (300 semillas)", () => {
    const participants = makeParticipants(2, 1);
    let conciergeCount = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const assignments = assignRoles(participants, seededRng(seed));
      const roles = assignments.map((assignment) => assignment.roleId);
      expect(assignments).toHaveLength(3);
      expect(new Set(assignments.map((assignment) => assignment.playerId)).size).toBe(3);
      assertRule(roles);
      if (roles.includes("concierge")) conciergeCount += 1;
    }
    expect(conciergeCount).toBeGreaterThan(0);
  });

  it("con 14 participantes usa los 14 roles exactamente una vez", () => {
    const participants = makeParticipants(14, 0);
    const assignments = assignRoles(participants, seededRng(99));
    const roles = assignments.map((assignment) => assignment.roleId);
    expect(roles).toHaveLength(14);
    expect(new Set(roles)).toEqual(new Set(ROLE_IDS));
    expect(roles).toContain("concierge");
    expect(roles).toContain("president");
    assertRule(roles);
  });

  it("con 10 participantes (máximo de partida) reparte 10 roles únicos y cumple la regla", () => {
    const participants = makeParticipants(6, 4);
    for (let seed = 1; seed <= 200; seed += 1) {
      const assignments = assignRoles(participants, seededRng(seed));
      const roles = assignments.map((assignment) => assignment.roleId);
      expect(roles).toHaveLength(10);
      expect(new Set(roles).size).toBe(10);
      assertRule(roles);
    }
  });

  it("con IA y humanos mezclados mantiene la regla y asigna a todos", () => {
    const participants = makeParticipants(2, 2);
    for (let seed = 1; seed <= 200; seed += 1) {
      const assignments = assignRoles(participants, seededRng(seed));
      expect(assignments).toHaveLength(4);
      expect(new Set(assignments.map((assignment) => assignment.playerId)).size).toBe(4);
      assertRule(assignments.map((assignment) => assignment.roleId));
    }
  });

  it("puede caer el conserje en una IA y el presidente en un humano (y viceversa)", () => {
    const participants = makeParticipants(2, 2);
    let conciergeAi = false;
    let conciergeHuman = false;
    let presidentAi = false;
    let presidentHuman = false;

    for (let seed = 1; seed <= 400; seed += 1) {
      const assignments = assignRoles(participants, seededRng(seed));
      for (const assignment of assignments) {
        const participant = participants.find((item) => item.id === assignment.playerId);
        if (!participant) continue;
        if (assignment.roleId === "concierge" && participant.kind === "ai") conciergeAi = true;
        if (assignment.roleId === "concierge" && participant.kind === "human") conciergeHuman = true;
        if (assignment.roleId === "president" && participant.kind === "ai") presidentAi = true;
        if (assignment.roleId === "president" && participant.kind === "human") presidentHuman = true;
      }
    }

    expect(conciergeAi).toBe(true);
    expect(conciergeHuman).toBe(true);
    expect(presidentAi).toBe(true);
    expect(presidentHuman).toBe(true);
  });

  it("lanza error si hay más participantes que roles", () => {
    expect(() => assignRoles(makeParticipants(15, 0))).toThrow(/solo hay 14/);
  });
});
