import type { ServerErrorCode } from "@shared/index";

/** Error de dominio con un código estable para el cliente. */
export class GameError extends Error {
  readonly code: ServerErrorCode;

  constructor(code: ServerErrorCode, message: string) {
    super(message);
    this.name = "GameError";
    this.code = code;
  }
}
