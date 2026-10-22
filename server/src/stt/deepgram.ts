import { z } from "zod";
import { SttError, type SttOptions, type SttProvider } from "./types.js";

const deepgramResponseSchema = z.object({
  results: z
    .object({
      channels: z
        .array(
          z.object({
            alternatives: z
              .array(
                z.object({
                  transcript: z.string(),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    })
    .optional(),
});

/** Deepgram (pre-grabado, modelo Nova). */
export class DeepgramSttProvider implements SttProvider {
  readonly name = "deepgram";

  constructor(private readonly apiKey: string | undefined) {}

  async transcribe(audio: Buffer, options: SttOptions): Promise<string> {
    if (!this.apiKey) {
      throw new SttError("CONFIG", "DEEPGRAM_API_KEY no está configurada.");
    }

    const params = new URLSearchParams({
      model: "nova-3",
      language: options.language,
      smart_format: "true",
      punctuate: "true",
    });

    let response: Response;
    try {
      response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": options.mimeType,
        },
        body: new Uint8Array(audio),
      });
    } catch (error: unknown) {
      throw new SttError("TRANSIENT", "No se pudo conectar con Deepgram.", { cause: error });
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new SttError(
        "TRANSIENT",
        `Deepgram respondió ${response.status}.`,
        { cause: new Error(detail.slice(0, 500)) },
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error: unknown) {
      throw new SttError("TRANSIENT", "Deepgram devolvió una respuesta ilegible.", {
        cause: error,
      });
    }

    const parsed = deepgramResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new SttError("TRANSIENT", "Deepgram devolvió un formato inesperado.", {
        cause: parsed.error,
      });
    }

    const transcript =
      parsed.data.results?.channels[0]?.alternatives[0]?.transcript ?? "";
    return transcript.trim();
  }
}
