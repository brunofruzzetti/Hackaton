import { describe, expect, it } from "vitest";
import {
  createSttProvider,
  SttError,
  transcribeWithRetry,
  type SttProvider,
} from "./index.js";

class FlakyProvider implements SttProvider {
  readonly name = "flaky";
  attempts = 0;

  async transcribe(): Promise<string> {
    this.attempts += 1;
    if (this.attempts === 1) {
      throw new SttError("TRANSIENT", "fallo temporal");
    }
    return "transcripción recuperada";
  }
}

class ConfigErrorProvider implements SttProvider {
  readonly name = "config-error";
  attempts = 0;

  async transcribe(): Promise<string> {
    this.attempts += 1;
    throw new SttError("CONFIG", "falta la API key");
  }
}

describe("SttProvider", () => {
  it("el proveedor mock devuelve texto sin llamar a APIs", async () => {
    const provider = createSttProvider("mock", { openai: undefined, deepgram: undefined });
    const text = await provider.transcribe(Buffer.from("audio-de-prueba"), {
      mimeType: "audio/webm;codecs=opus",
      language: "es",
    });
    expect(provider.name).toBe("mock");
    expect(text.length).toBeGreaterThan(10);
  });

  it("reintenta una vez los fallos transitorios", async () => {
    const provider = new FlakyProvider();
    const text = await transcribeWithRetry(provider, Buffer.from("x"), {
      mimeType: "audio/webm",
      language: "es",
    });
    expect(text).toBe("transcripción recuperada");
    expect(provider.attempts).toBe(2);
  });

  it("no reintenta errores de configuración", async () => {
    const provider = new ConfigErrorProvider();
    await expect(
      transcribeWithRetry(provider, Buffer.from("x"), {
        mimeType: "audio/webm",
        language: "es",
      }),
    ).rejects.toBeInstanceOf(SttError);
    expect(provider.attempts).toBe(1);
  });
});
