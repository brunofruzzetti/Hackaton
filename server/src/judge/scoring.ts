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
 * Puntuación por ronda calculada en servidor:
 *   puntos de tareas (1/2/3 según dificultad) + bonus de rol (0-5).
 * El modelo solo aporta el estado de cada tarea y las notas 0-100.
 */
export function computeRoundResult(
  input: JudgeRoundInput,
  judge: JudgeResponse,
): RoundResult {
  const judgeByPlayer = new Map(judge.players.map((player) => [player.playerId, player]));
  const rubricWeights = SCORING_CONFIG.RUBRIC_WEIGHTS;

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

    const taskPointsPossible = player.tasks.reduce((total, task) => total + task.points, 0);
    const taskPoints = player.tasks.reduce((total, task) => {
      const result = taskResults.find((item) => item.taskId === task.id);
      return result?.cumplida ? total + task.points : total;
    }, 0);

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

    const rubricPct = clampScore(
      fidelidad * rubricWeights.fidelidad_cliche +
        participacion * rubricWeights.participacion +
        creatividad * rubricWeights.creatividad +
        reaccion * rubricWeights.reaccion_a_otros,
    );
    const roleBonus = Math.max(
      0,
      Math.min(SCORING_CONFIG.ROLE_BONUS_MAX, Math.round((rubricPct / 100) * SCORING_CONFIG.ROLE_BONUS_MAX)),
    );
    const totalPoints = taskPoints + roleBonus;

    const bestTaskEvidence =
      taskResults.find((task) => task.cumplida && task.evidencia.length > 0)?.evidencia ?? "";
    const evidencia = judged?.evidencia || bestTaskEvidence || "Sin evidencia en el acta.";

    return {
      playerId: player.id,
      playerName: player.name,
      roleId: player.roleId,
      tasks: taskResults,
      taskPoints,
      taskPointsPossible,
      roleBonus,
      totalPoints,
      scores: {
        fidelidad_cliche: fidelidad,
        participacion,
        creatividad,
        reaccion_a_otros: reaccion,
      },
      evidencia: evidencia.slice(0, 300),
      comentarioGracioso:
        judged?.comentario_gracioso || "El acta no recoge comentarios, pero el buzón está lleno.",
      orderWarnings: player.orderWarnings,
    };
  });

  players.sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    round: input.round,
    judgedAt: Date.now(),
    players,
  };
}
