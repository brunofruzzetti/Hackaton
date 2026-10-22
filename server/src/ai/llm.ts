import OpenAI from "openai";
import { AI_CONFIG, type RoleId } from "@shared/index";
import { env } from "../env.js";

export interface NeighborLlmInput {
  systemPrompt: string;
  userPrompt: string;
  roleId: RoleId;
  playerName: string;
  proposal: string;
}

export interface LlmService {
  readonly name: string;
  /** Devuelve una intervención corta o null si no se pudo generar. */
  generateNeighborLine(input: NeighborLlmInput): Promise<string | null>;
}

const MOCK_LINES: Record<RoleId, string[]> = {
  gossip: [
    "Yo me enteré de que el del cuarto ha estado recibiendo paquetes muy raros. Y no digo más, pero aquí hay tema.",
    "A mí me han dicho que la del quinto cambia los muebles cada semana. Yo solo pregunto, que conste.",
  ],
  debtor: [
    "Yo encantado de pagar, pero es que la transferencia se me quedó en el limbo. La semana que viene seguro.",
    "Hablando de dinero, ¿alguien ha visto cómo está el precio de la luz? Porque lo del ascensor igual puede esperar.",
  ],
  president: [
    "A ver, por favor, un poco de orden. Propongo que esto lo decidamos con calma y, si eso, en la próxima junta.",
    "Yo lo que quiero es que todos estemos contentos, pero como sigamos así no salimos de aquí ni en agosto.",
  ],
  spender: [
    "Yo lo del ascensor lo veo barato. Son cuatro duros por vecino y quedamos como reyes.",
    "Ya que estamos, podíamos poner también un vestíbulo con fuente. Total, cuatro duros más.",
  ],
  clueless: [
    "Perdón, ¿esto del ascensor era para subir o para bajar? Es que me he perdido al principio.",
    "Yo estoy de acuerdo con lo que ha dicho el señor, aunque no sé muy bien de qué hablaba.",
  ],
  squatter: [
    "Yo creo que lo importante es que el portal funcione, sin mirar tanto quién vive dónde. Eso da igual.",
    "¿Quién ha preguntado? Es que con tanto jaleo no me entero. Yo llevo aquí poco, pero pago lo que haga falta.",
  ],
  catlady: [
    "Eso del ascensor le va a sentar fatal a Michi, que ya no soporta el ruido de la puerta. Y Lulú igual.",
    "A ver si arreglan de una vez el olor del patio, que mis gatos no pueden ni salir a tomar el aire.",
  ],
  concierge: [
    "Lo que diga el presidente me parece bien. Yo estoy aquí para lo que haga falta.",
    "Como dice el presidente, hay que hacerlo con calma. Yo le secundo en todo.",
  ],
  inlaw: [
    "Yo tengo un primo que monta ascensores y dice que esto se hace en dos tardes. Lo que pasa es que aquí nadie pregunta.",
    "Esto es como cuando subió la luz: todo el mundo opina y nadie sabe. Yo lo tengo clarísimo, eh.",
  ],
  handyman: [
    "Eso lo hago yo en un rato con una radial y cuatro tornillos. No hace falta pagar a ningún profesional.",
    "Los presupuestos esos son un robo. Con cinta aislante y maña se arregla el ascensor entero.",
  ],
  expresident: [
    "Yo lo hacía mejor, para qué nos vamos a engañar. Cuando estaba yo, esto funcionaba como un reloj.",
    "Ya propuse yo algo parecido en mi época y salió mal por falta de apoyo. Pero oye, ahora mandan otros.",
  ],
  tenant: [
    "Yo pago mi alquiler cada mes, pero la derrama entiendo que le corresponderá al casero, ¿no?",
    "No es por nada, pero yo no soy propietario. Si hay que pagar, tendrá que decidirlo quien sea el dueño.",
  ],
  remote: [
    "A mí lo que me hace falta es que no haya obras a las nueve de la mañana. Tengo videollamadas y se oye todo.",
    "Y ya que estamos, podíamos poner fibra de verdad. Que aquí parece que trabajamos con palomas mensajeras.",
  ],
  eco: [
    "Yo lo del ascensor lo veo, pero antes pondría placas solares. La factura de la comunidad se nos come.",
    "Podíamos aprovechar la azotea para un huerto y un aparcabicis. Menos cemento y más bici, por favor.",
  ],
};

function cleanLine(text: string): string {
  return text
    .replace(/^[\s"'«»“”]+|[\s"'«»“”]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, AI_CONFIG.MAX_LINE_CHARS)
    .trim();
}

export class MockLlmService implements LlmService {
  readonly name = "mock";
  private cursor = 0;

  async generateNeighborLine(input: NeighborLlmInput): Promise<string> {
    const lines = MOCK_LINES[input.roleId];
    const line = lines[this.cursor % lines.length] ?? "Yo creo que habría que hablarlo con calma.";
    this.cursor += 1;
    return cleanLine(line);
  }
}

class DeepSeekLlmService implements LlmService {
  readonly name = "deepseek";
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: AI_CONFIG.GENERATION_TIMEOUT_MS,
      maxRetries: 1,
    });
  }

  async generateNeighborLine(input: NeighborLlmInput): Promise<string | null> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        temperature: 0.95,
        max_tokens: 160,
        presence_penalty: 0.2,
        frequency_penalty: 0.2,
      });
      const content = completion.choices[0]?.message.content;
      if (!content) return null;
      const line = cleanLine(content);
      return line.length > 0 ? line : null;
    } catch (error: unknown) {
      console.error(
        `[ai] Error generando línea con DeepSeek (${input.playerName}):`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}

export function createLlmService(): LlmService {
  if (env.LLM_PROVIDER === "mock" || !env.DEEPSEEK_API_KEY) {
    if (env.LLM_PROVIDER !== "mock") {
      console.warn("[ai] DEEPSEEK_API_KEY ausente: se usa el generador mock de desarrollo.");
    }
    console.log("[ai] Proveedor de vecinos IA: mock");
    return new MockLlmService();
  }
  console.log("[ai] Proveedor de vecinos IA: DeepSeek (deepseek-chat)");
  return new DeepSeekLlmService(env.DEEPSEEK_API_KEY);
}
