import { describe, expect, it } from "vitest";
import type { PlayerTask, TranscriptEntry } from "@shared/index";
import { MockJudgeService } from "./index.js";
import { buildJudgePrompt, type JudgeRoundInput } from "./prompt.js";
import { computeRoundResult } from "./scoring.js";
import { judgeResponseSchema } from "./schema.js";

const tasks: PlayerTask[] = [
  {
    id: "gossip_1",
    roleId: "gossip",
    text: "Suelta un rumor.",
    difficulty: "easy",
    tags: ["rumor"],
    points: 1,
    kind: "solo",
    source: "role",
  },
  {
    id: "gossip_8",
    roleId: "gossip",
    text: "Descubre un secreto.",
    difficulty: "hard",
    tags: ["revelacion"],
    points: 3,
    kind: "solo",
    source: "role",
  },
];

const transcript: TranscriptEntry[] = [
  {
    id: "t1",
    at: 1,
    playerId: "h1",
    playerName: "Ana",
    roleId: "gossip",
    text: "Yo me enteré de que el del cuarto tiene un gato nuevo.",
    source: "voice",
  },
];

const input: JudgeRoundInput = {
  code: "ABCD",
  round: 1,
  proposal: "Instalar un ascensor",
  presidentStyleId: "reluctant",
  transcript,
  players: [
    {
      id: "h1",
      name: "Ana",
      roleId: "gossip",
      roleName: "El cotilla",
      behaviors: ["Suelta rumores", "Pregunta por vidas ajenas"],
      discrete: false,
      tasks,
      orderWarnings: 1,
    },
  ],
  events: [],
};

describe("juez de ronda", () => {
  it("el prompt incluye reglas, tareas, avisos y el suceso", () => {
    const prompt = buildJudgePrompt({
      ...input,
      events: [
        {
          id: "e1",
          title: "Se rompe el ascensor",
          description: "El ascensor se ha quedado parado.",
          roles: ["handyman"],
          tags: ["averia"],
        },
      ],
    });
    expect(prompt.systemPrompt).toMatch(/errores de transcripción/i);
    expect(prompt.systemPrompt).toMatch(/dame 100%/i);
    expect(prompt.systemPrompt).toMatch(/conserje y el okupa/i);
    expect(prompt.userPrompt).toContain("gossip_1");
    expect(prompt.userPrompt).toContain("Avisos de orden en la ronda: 1");
    expect(prompt.userPrompt).toContain("Se rompe el ascensor");
    expect(prompt.userPrompt).toContain("Ana");
  });

  it("valida el JSON del juez con zod", () => {
    const parsed = judgeResponseSchema.safeParse({
      players: [
        {
          playerId: "h1",
          tasks: [{ taskId: "gossip_1", cumplida: true, evidencia: "me enteré" }],
          scores: {
            fidelidad_cliche: 80,
            participacion: 80,
            creatividad: 60,
            reaccion_a_otros: 40,
          },
          evidencia: "me enteré",
          comentario_gracioso: "Buen rumor.",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("calcula puntos de tareas y bonus de rol en servidor", () => {
    const result = computeRoundResult(input, {
      players: [
        {
          playerId: "h1",
          tasks: [
            { taskId: "gossip_1", cumplida: true, evidencia: "me enteré" },
            { taskId: "gossip_8", cumplida: true, evidencia: "me enteré" },
          ],
          scores: {
            fidelidad_cliche: 80,
            participacion: 80,
            creatividad: 60,
            reaccion_a_otros: 40,
          },
          evidencia: "Yo me enteré de que el del cuarto tiene un gato nuevo.",
          comentario_gracioso: "Buen rumor.",
        },
      ],
    });

    expect(result.players).toHaveLength(1);
    const player = result.players[0];
    expect(player?.taskPoints).toBe(4);
    expect(player?.taskPointsPossible).toBe(4);
    expect(player?.scores.participacion).toBe(70);
    // Rubric: 80*.4 + 70*.2 + 60*.2 + 40*.2 = 66 -> bonus 3 de 5
    expect(player?.roleBonus).toBe(3);
    expect(player?.totalPoints).toBe(7);
    expect(player?.tasks[0]?.taskText).toBe("Suelta un rumor.");
    expect(player?.orderWarnings).toBe(1);
  });

  it("el juez mock evalúa todas las tareas y devuelve notas", async () => {
    const judge = new MockJudgeService();
    const response = await judge.evaluate(input);
    expect(response.players).toHaveLength(1);
    expect(response.players[0]?.tasks).toHaveLength(2);
    expect(response.players[0]?.tasks[0]?.taskId).toBe("gossip_1");
    expect(response.players[0]?.scores.fidelidad_cliche).toBeGreaterThanOrEqual(0);
    expect(response.players[0]?.comentario_gracioso.length).toBeGreaterThan(0);
  });
});
