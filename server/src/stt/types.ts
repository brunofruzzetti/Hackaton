/** Error controlado de transcripción, con una causa clasificada. */
export type SttErrorKind = "CONFIG" | "TRANSIENT" | "EMPTY";

export class SttError extends Error {
  readonly kind: SttErrorKind;

  constructor(kind: SttErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SttError";
    this.kind = kind;
  }
}

export interface SttOptions {
  /** MIME real del clip (audio/webm;codecs=opus, audio/mp4...). */
  mimeType: string;
  /** Idioma esperado de la transcripción. */
  language: string;
}

/** Proveedor de STT intercambiable. */
export interface SttProvider {
  readonly name: string;
  transcribe(audio: Buffer, options: SttOptions): Promise<string>;
}
