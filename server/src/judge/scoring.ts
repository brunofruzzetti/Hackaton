import {
  JUDGE_CONFIG,
  SCORING_CONFIG,
  type PlayerRoundResult,
  type RoundResult,
  type TaskEvaluation,
  type TranscriptEntry,
} from "@shared/index";
import type { JudgeRoundInput } from "./prompt.js";
import type { JudgeResponse } from "./schema.js";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function evidenceExists(transcript: readonly TranscriptEntry[], evidence: string): boolean {
  const needle = normalize(evidence);
  if (needle.length < 4) return false;
  const haystack = normalize(transcript.map((entry) => entry.text).join(" "));
  return haystack.includes(needle);
}

/**
 * Calcula el resultado de la ronda en servidor. El modelo solo aporta notas y
 * el estado de cada tarea; aquí se aplican pesos, avisos y dinero.
 */
export function computeRoundResult(
  input: JudgeRoundInput,
  judge: JudgeResponse,
): RoundResult {
  const judgeByPlayer = new Map(judge.players.map((player) => [player.playerId, player]));
  const weights = SCORING_CONFIG.WEIGHTS;

  const players: PlayerRoundResult[] = input.players.map((player) => {
    const judged = judgeByPlayer.get(player.id);
    const taskResults: TaskEvaluation[] = player.tasks.map((task) => {
      const evaluated = judged?.tasks.find((item) => item.taskId === task.id);
      const evidence = evaluated?.evidencia ?? "";
      return {
        taskId: task.id,
        taskText: task.text,
        cumplida: evaluated?.cumplida ?? false,
        evidencia: evidenceExists(input.transcript, evidence) ? evidence : evidence.slice(0, 200),
      };
    });

    const possible = player.tasks.reduce((total, task) => total + task.points, 0);
    const earned = player.tasks.reduce((total, task) => {
      const result = taskResults.find((item) => item.taskId === task.id);
      return result?.cumplida ? total + task.points : total;
    }, 0);
    const taskScore = possible > 0 ? clampScore((earned / possible) * 100) : 0;

    const rawScores = judged?.scores ?? {
      fidelidad_cliche: 0,
      participacion: 0,
      creatividad: 0,
      reaccion_a_otros: 0,
    };
    const fidelidad = clampScore(rawScores.fidelidad_cliche);
    const participacion = clampScore(
      Math.max(0, rawScores.participacion - player.orderWarnings * JUDGE_CONFIG.ORDER_WARNING_PENALTY),
    );
    const creatividad = clampScore(rawScores.creatividad);
    const reaccion = clampScore(rawScores.reaccion_a_otros);

    const totalPct = clampScore(
      taskScore * weights.tareas +
        fidelidad * weights.fidelidad_cliche +
        participacion * weights.participacion +
        creatividad * weights.creatividad +
        reaccion * weights.reaccion_a_otros,
    );
    const money = Math.round(totalPct * SCORING_CONFIG.MONEY_PER_PERCENT);

    const bestTaskEvidence =
      taskResults.find((task) => task.cumplida && task.evidencia.length > 0)?.evidencia ?? "";
    const evidencia = judged?.evidencia || bestTaskEvidence || "Sin evidencia en el acta.";

    return {
      playerId: player.id,
      playerName: player.name,
      roleId: player.roleId,
      tasks: taskResults,
      taskScore,
      scores: {
        fidelidad_cliche: fidelidad,
        participacion,
        creatividad,
        reaccion_a_otros: reaccion,
      },
      totalPct,
      money,
      evidencia: evidencia.slice(0, 300),
      comentarioGracioso:
        judged?.comentario_gracioso || "El acta no recoge comentarios, pero el buzón está lleno.",
      orderWarnings: player.orderWarnings,
    };
  });

  players.sort((a, b) => b.totalPct - a.totalPct);

  return {
    round: input.round,
    judgedAt: Date.now(),
    players,
  };
}
