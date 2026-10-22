import type { SttOptions, SttProvider } from "./types.js";

const MOCK_PHRASES = [
  "[Transcripción simulada] Yo me enteré de que lo del ascensor lo propuso el del cuarto.",
  "[Transcripción simulada] A mí me parece muy caro, pero son cuatro duros por vecino.",
  "[Transcripción simulada] Perdón, ¿de qué estamos hablando exactamente?",
  "[Transcripción simulada] Mis gatos no soportan el ruido de las obras.",
  "[Transcripción simulada] Lo que diga el presidente me parece bien.",
];

/** Proveedor de desarrollo: no llama a ninguna API externa. */
export class MockSttProvider implements SttProvider {
  readonly name = "mock";

  async transcribe(audio: Buffer, _options: SttOptions): Promise<string> {
    if (audio.length === 0) return "";
    const index = audio.length % MOCK_PHRASES.length;
    return MOCK_PHRASES[index] ?? MOCK_PHRASES[0] ?? "";
  }
}
