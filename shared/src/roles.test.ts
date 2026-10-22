import { describe, expect, it } from "vitest";
import { buildRolePrompt, ROLE_IDS, ROLES } from "./roles.js";

describe("definición de roles", () => {
  it("hay exactamente 8 roles con ids únicos", () => {
    expect(ROLE_IDS).toHaveLength(8);
    expect(new Set(ROLE_IDS).size).toBe(8);
  });

  it("cada rol tiene nombre, descripción, 3-4 comportamientos y prompt de IA", () => {
    for (const roleId of ROLE_IDS) {
      const role = ROLES[roleId];
      expect(role.id).toBe(roleId);
      expect(role.name.length).toBeGreaterThan(2);
      expect(role.description.length).toBeGreaterThan(10);
      expect(role.expectedBehaviors.length).toBeGreaterThanOrEqual(3);
      expect(role.expectedBehaviors.length).toBeLessThanOrEqual(4);
      expect(role.aiPersonalityPrompt.length).toBeGreaterThan(20);
    }
  });

  it("solo el okupa y el conserje no votan", () => {
    const nonVoters = ROLE_IDS.filter((roleId) => !ROLES[roleId].votes);
    expect(nonVoters.sort()).toEqual(["concierge", "squatter"]);
  });

  it("marca okupa y conserje como roles discretos", () => {
    expect(ROLES.squatter.discrete).toBe(true);
    expect(ROLES.concierge.discrete).toBe(true);
  });

  it("el prompt del conserje incluye el nombre del presidente", () => {
    const prompt = buildRolePrompt("concierge", { presidentName: "Paco" });
    expect(prompt).toContain("Paco");
    expect(prompt).not.toContain("{presidentName}");
  });
});
