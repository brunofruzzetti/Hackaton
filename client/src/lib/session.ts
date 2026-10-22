export interface Session {
  code: string;
  playerId: string;
  name: string;
  token: string;
}

const STORAGE_KEY = "junta.session.v1";
const CODE_PATTERN = /^[A-Z]{4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (!isNonEmptyString(parsed.code) || !CODE_PATTERN.test(parsed.code)) return null;
    if (!isNonEmptyString(parsed.playerId)) return null;
    if (!isNonEmptyString(parsed.name)) return null;
    if (!isNonEmptyString(parsed.token)) return null;
    return {
      code: parsed.code,
      playerId: parsed.playerId,
      name: parsed.name,
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Modo privado o almacenamiento lleno: se pierde la reconexión automática, nada crítico.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorado.
  }
}

/** Código de sala presente en /sala/ABCD o ?code=ABCD. */
export function codeFromUrl(): string | null {
  const pathMatch = /^\/sala\/([a-zA-Z]{4})\/?$/.exec(window.location.pathname);
  if (pathMatch?.[1]) return pathMatch[1].toUpperCase();
  const queryMatch = /[?&]code=([a-zA-Z]{4})/.exec(window.location.search);
  if (queryMatch?.[1]) return queryMatch[1].toUpperCase();
  return null;
}
