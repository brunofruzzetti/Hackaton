import { z } from "zod";

export const judgeTaskEvaluationSchema = z.object({
  taskId: z.string().min(1),
  cumplida: z.boolean(),
  evidencia: z.string().max(300).optional().default(""),
});

export const judgePlayerResponseSchema = z.object({
  playerId: z.string().min(1),
  tasks: z.array(judgeTaskEvaluationSchema),
  scores: z.object({
    fidelidad_cliche: z.number(),
    participacion: z.number(),
    creatividad: z.number(),
    reaccion_a_otros: z.number(),
  }),
  evidencia: z.string().max(300).optional().default(""),
  comentario_gracioso: z.string().max(400).optional().default(""),
});

export const judgeResponseSchema = z.object({
  players: z.array(judgePlayerResponseSchema).min(1),
});

export type JudgeResponse = z.infer<typeof judgeResponseSchema>;
export type JudgePlayerResponse = z.infer<typeof judgePlayerResponseSchema>;
export type JudgeTaskEvaluation = z.infer<typeof judgeTaskEvaluationSchema>;
