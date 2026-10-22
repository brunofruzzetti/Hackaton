import OpenAI from "openai";
import { JUDGE_CONFIG } from "@shared/index";
import { env } from "../env.js";
import { buildJudgePrompt, type JudgeRoundInput } from "./prompt.js";
import {
  judgeResponseSchema,
  type JudgeResponse,
} from "./schema.js";

export interface JudgeService {
  readonly name: string;
  evaluate(input: JudgeRoundInput): Promise<JudgeResponse>;
}

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("El juez no devolvió JSON válido.");
  }
}

const HASH_COMMENTS = [
  "Ha estado sembrado, aunque el acta no recoge si era legal.",
  "Se ha lucido, pero el administrador va a pedir una segunda cita.",
  "Ha defendido su papel con más conviction que el presupuesto.",
  "Un gran momento para el acta, regular para la comunidad.",
  "Ha cumplido su papel y de paso ha subido la tensión del portal.",
];

class MockJudgeService implements JudgeService {
  readonly name = "mock";

  async evaluate(input: JudgeRoundInput): Promise<JudgeResponse> {
    const players = input.players.map((player, playerIndex) => {
      const entries = input.transcript.filter((entry) => entry.playerId === player.id);
      const last = entries[entries.length - 1];
      const tasks = player.tasks.map((task) => {
        const needed = task.difficulty === "easy" ? 1 : task.difficulty === "medium" ? 2 : 3;
        const cumplida = entries.length >= needed;
        return {
          taskId: task.id,
          cumplida,
          evidencia: cumplida ? (last?.text ?? "").slice(0, 200) : "",
        };
      });
      const seed = (playerIndex + 1) * 17 + player.id.length * 7;
      return {
        playerId: player.id,
        tasks,
        scores: {
          fidelidad_cliche: 55 + (seed % 30),
          participacion: Math.min(100, 35 + entries.length * 15),
          creatividad: 50 + (seed % 40),
          reaccion_a_otros: 45 + (seed % 35),
        },
        evidencia: (last?.text ?? "No ha dejado huella en el acta.").slice(0, 200),
        comentario_gracioso: HASH_COMMENTS[seed % HASH_COMMENTS.length] ?? HASH_COMMENTS[0] ?? "",
      };
    });

    return { players };
  }
}

class DeepSeekJudgeService implements JudgeService {
  readonly name = "deepseek";
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: 45_000,
      maxRetries: 1,
    });
  }

  async evaluate(input: JudgeRoundInput): Promise<JudgeResponse> {
    const { systemPrompt, userPrompt } = buildJudgePrompt(input);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const completion = await this.client.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 4096,
        });
        const content = completion.choices[0]?.message.content;
        if (!content) throw new Error("El juez devolvió una respuesta vacía.");
        const parsed = judgeResponseSchema.safeParse(parseJson(content));
        if (!parsed.success) {
          throw new Error(`JSON del juez inválido: ${parsed.error.issues[0]?.message ?? "error"}`);
        }
        return parsed.data;
      } catch (error: unknown) {
        lastError = error;
        console.warn(
          `[judge] Intento ${attempt + 1} fallido:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    throw new Error(
      `El juez no pudo evaluar la ronda: ${lastError instanceof Error ? lastError.message : "error"}`,
    );
  }
}

export function createJudgeService(): JudgeService {
  if (env.LLM_PROVIDER === "mock" || !env.DEEPSEEK_API_KEY) {
    console.log(`[judge] Proveedor final: mock (${JUDGE_CONFIG.ORDER_WARNING_PENALTY} pts por aviso)`);
    return new MockJudgeService();
  }
  console.log("[judge] Proveedor final: DeepSeek (deepseek-chat, JSON)");
  return new DeepSeekJudgeService(env.DEEPSEEK_API_KEY);
}

export { MockJudgeService };
