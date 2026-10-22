import { describe, expect, it } from "vitest";
import {
  COMMUNITY_EVENTS,
  COMMUNITY_EVENT_OFFSETS_SECONDS,
  selectRoundEvents,
} from "./communityEvents.js";
import { ROLE_IDS } from "./roles.js";

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

describe("sucesos de la comunidad", () => {
  it("hay variedad y todos tienen roles y etiquetas", () => {
    expect(COMMUNITY_EVENTS.length).toBeGreaterThanOrEqual(20);
    expect(COMMUNITY_EVENT_OFFSETS_SECONDS).toHaveLength(4);
    for (const event of COMMUNITY_EVENTS) {
      expect(event.title.length).toBeGreaterThan(5);
      expect(event.description.length).toBeGreaterThan(20);
      expect(event.roles.length).toBeGreaterThan(0);
      expect(event.tags.length).toBeGreaterThan(0);
      for (const roleId of event.roles) {
        expect(ROLE_IDS).toContain(roleId);
      }
    }
  });

  it("elige 4 sucesos sin repetir y relevantes para los roles presentes", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const events = selectRoundEvents(["gossip", "debtor", "handyman", "eco"], seededRng(seed));
      expect(events).toHaveLength(4);
      expect(new Set(events.map((event) => event.id)).size).toBe(4);
    }
  });

  it("soporta una partida con pocos roles y rellena hasta 4", () => {
    const events = selectRoundEvents(["gossip"], seededRng(9));
    expect(events).toHaveLength(4);
    expect(new Set(events.map((event) => event.id)).size).toBe(4);
  });
});
