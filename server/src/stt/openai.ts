import OpenAI, { toFile } from "openai";
import { SttError, type SttOptions, type SttProvider } from "./types.js";

function extensionForMime(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "audio/webm";
  switch (base) {
    case "audio/mp4":
    case "audio/x-m4a":
      return "mp4";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/mpeg":
      return "mp3";
    default:
      return "webm";
  }
}

/** OpenAI Whisper. La clave se comprueba de forma perezosa para no tumbar el arranque. */
export class OpenAiSttProvider implements SttProvider {
  readonly name = "openai";
  private client: OpenAI | null = null;

  constructor(private readonly apiKey: string | undefined) {}

  private getClient(): OpenAI {
    if (!this.apiKey) {
      throw new SttError("CONFIG", "OPENAI_API_KEY no está configurada.");
    }
    this.client ??= new OpenAI({ apiKey: this.apiKey });
    return this.client;
  }

  async transcribe(audio: Buffer, options: SttOptions): Promise<string> {
    const client = this.getClient();
    try {
      const file = await toFile(audio, `clip.${extensionForMime(options.mimeType)}`, {
        type: options.mimeType,
      });
      const result = await client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: options.language,
      });
      return result.text.trim();
    } catch (error: unknown) {
      if (error instanceof SttError) throw error;
      throw new SttError("TRANSIENT", "OpenAI Whisper no pudo transcribir el clip.", {
        cause: error,
      });
    }
  }
}
