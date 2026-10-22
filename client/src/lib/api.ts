import type { Session } from "./session";

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

export interface PublicConfig {
  livekitConfigured: boolean;
  livekitUrl: string | null;
  supabaseConfigured?: boolean;
  minPlayers: number;
  maxPlayers: number;
}

export interface LivekitTokenResponse {
  url: string;
  token: string;
  roomName: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = "SERVER_ERROR";
  let message = `El servidor respondió ${response.status}.`;
  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      const parsed = body as ApiErrorBody;
      if (typeof parsed.error === "string") code = parsed.error;
      if (typeof parsed.message === "string") message = parsed.message;
    }
  } catch {
    // Respuesta sin JSON: se mantiene el mensaje genérico.
  }
  return new ApiError(response.status, code, message);
}

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as PublicConfig;
}

export async function requestLivekitToken(session: Session): Promise<LivekitTokenResponse> {
  const response = await fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: session.code,
      playerId: session.playerId,
      sessionToken: session.token,
    }),
  });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as LivekitTokenResponse;
}
