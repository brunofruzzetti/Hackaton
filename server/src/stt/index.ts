import { DeepgramSttProvider } from "./deepgram.js";
import { MockSttProvider } from "./mock.js";
import { OpenAiSttProvider } from "./openai.js";
import { SttError, type SttOptions, type SttProvider } from "./types.js";

export type SttProviderName = "openai" | "deepgram" | "mock";

export interface SttKeys {
  openai: string | undefined;
  deepgram: string | undefined;
}

export function createSttProvider(name: SttProviderName, keys: SttKeys): SttProvider {
  switch (name) {
    case "openai":
      console.log("[stt] Proveedor: OpenAI Whisper");
      return new OpenAiSttProvider(keys.openai);
    case "deepgram":
      console.log("[stt] Proveedor: Deepgram Nova");
      return new DeepgramSttProvider(keys.deepgram);
    case "mock":
      console.log("[stt] Proveedor: mock (desarrollo, sin API externa)");
      return new MockSttProvider();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Un reintento simple ante fallos transitorios. Los errores de configuración
 * (falta de API key) no se reintentan.
 */
export async function transcribeWithRetry(
  provider: SttProvider,
  audio: Buffer,
  options: SttOptions,
): Promise<string> {
  try {
    return await provider.transcribe(audio, options);
  } catch (error: unknown) {
    if (error instanceof SttError && error.kind === "CONFIG") {
      throw error;
    }
    console.warn(
      `[stt] Fallo transitorio con ${provider.name}; reintentando una vez:`,
      error instanceof Error ? error.message : error,
    );
    await delay(350);
    return provider.transcribe(audio, options);
  }
}

export { SttError };
export type { SttOptions, SttProvider };
