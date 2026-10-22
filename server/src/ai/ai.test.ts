import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "@shared/index";
import { MockLlmService } from "./llm.js";
import { buildNeighborPrompt } from "./prompt.js";
import { estimateTextDisplayMs } from "./textTiming.js";

const transcript: TranscriptEntry[] = [
  {
    id: "1",
    at: 1,
    playerId: "h1",
    playerName: "Ana",
    roleId: "gossip",
    text: "Yo me enteré de que el del cuarto tiene un gato nuevo.",
    source: "voice",
  },
];

const players = [
  { name: "Ana", roleId: "gossip" as const, kind: "human" as const },
  { name: "Paco", roleId: "president" as const, kind: "ai" as const },
  { name: "Manoli", roleId: "concierge" as const, kind: "ai" as const },
];

describe("prompt de vecino IA", () => {
  it("incluye rol, propuesta y transcripción reciente", () => {
    const prompt = buildNeighborPrompt({
      playerName: "Paco",
      roleId: "president",
      presidentStyleId: "dictator",
      proposal: "Instalar un ascensor",
      transcript,
      players,
      presidentName: "Paco",
    });
    expect(prompt.systemPrompt).toContain("El presidente dictador");
    expect(prompt.systemPrompt).toMatch(/Manda callar/i);
    expect(prompt.userPrompt).toContain("Instalar un ascensor");
    expect(prompt.userPrompt).toContain("[Ana | El cotilla]");
    expect(prompt.userPrompt).toContain("Paco");
  });

  it("el conserje IA recibe el nombre del presidente", () => {
    const prompt = buildNeighborPrompt({
      playerName: "Manoli",
      roleId: "concierge",
      presidentStyleId: "reluctant",
      proposal: "Cambiar el portero",
      transcript: [],
      players,
      presidentName: "Paco",
    });
    expect(prompt.systemPrompt).toContain("Paco");
    expect(prompt.systemPrompt).toContain("lo que diga el presidente");
    expect(prompt.userPrompt).toContain("La junta acaba de empezar.");
  });
});

describe("LLM mock", () => {
  it("genera una línea no vacía y limitada para cada rol", async () => {
    const llm = new MockLlmService();
    const roles = [
      "gossip",
      "debtor",
      "president",
      "spender",
      "clueless",
      "squatter",
      "catlady",
      "concierge",
      "inlaw",
      "handyman",
      "expresident",
      "tenant",
      "remote",
      "eco",
    ] as const;

    for (const roleId of roles) {
      const line = await llm.generateNeighborLine({
        systemPrompt: "sistema",
        userPrompt: "usuario",
        roleId,
        playerName: "IA",
        proposal: "Instalar un ascensor",
      });
      expect(line).toBeTruthy();
      expect((line ?? "").length).toBeLessThanOrEqual(320);
      expect(line).not.toContain("\n");
    }
  });
});

describe("texto IA", () => {
  it("calcula una duración de 'escribiendo' positiva y limitada", () => {
    expect(estimateTextDisplayMs("Hola vecinos")).toBeGreaterThan(1000);
    expect(estimateTextDisplayMs("x".repeat(1000))).toBeLessThanOrEqual(6000);
  });
});
