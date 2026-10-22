import { describe, expect, it } from "vitest";
import {
  PRESIDENT_STYLE_IDS,
  PRESIDENT_STYLES,
  ROLE_IDS,
  ROLES,
  buildRolePrompt,
  getEffectiveRole,
} from "./roles.js";

describe("definición de roles", () => {
  it("hay exactamente 14 roles con ids únicos", () => {
    expect(ROLE_IDS).toHaveLength(14);
    expect(new Set(ROLE_IDS).size).toBe(14);
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

  it("solo el okupa, el conserje y el inquilino no votan", () => {
    const nonVoters = ROLE_IDS.filter((roleId) => !ROLES[roleId].votes);
    expect(nonVoters.sort()).toEqual(["concierge", "squatter", "tenant"]);
  });

  it("marca okupa y conserje como roles discretos", () => {
    expect(ROLES.squatter.discrete).toBe(true);
    expect(ROLES.concierge.discrete).toBe(true);
  });

  it("define los 3 estilos de presidencia con comportamientos y prompt", () => {
    expect(PRESIDENT_STYLE_IDS).toEqual(["dictator", "reluctant", "influencer"]);
    for (const styleId of PRESIDENT_STYLE_IDS) {
      const style = PRESIDENT_STYLES[styleId];
      expect(style.id).toBe(styleId);
      expect(style.expectedBehaviors.length).toBeGreaterThanOrEqual(3);
      expect(style.expectedBehaviors.length).toBeLessThanOrEqual(4);
      expect(style.aiPersonalityPrompt.length).toBeGreaterThan(40);
    }
  });

  it("aplica el estilo elegido al rol presidente", () => {
    const dictator = getEffectiveRole("president", "dictator");
    expect(dictator.name).toBe("El presidente dictador");
    expect(dictator.expectedBehaviors.join(" ")).toMatch(/Manda callar/i);

    const influencer = getEffectiveRole("president", "influencer");
    expect(influencer.name).toBe("El presidente influencer");
    expect(influencer.expectedBehaviors.join(" ")).toMatch(/seguidores/i);

    expect(getEffectiveRole("gossip", "dictator").name).toBe("El cotilla");
  });

  it("el prompt del conserje incluye el nombre del presidente", () => {
    const prompt = buildRolePrompt("concierge", { presidentName: "Paco" });
    expect(prompt).toContain("Paco");
    expect(prompt).not.toContain("{presidentName}");
  });

  it("el prompt del presidente usa el estilo elegido", () => {
    const prompt = buildRolePrompt("president", { presidentStyleId: "reluctant" });
    expect(prompt).toMatch(/no querías el cargo/i);
  });
});
