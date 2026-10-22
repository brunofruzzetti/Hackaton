import { AccessToken } from "livekit-server-sdk";
import type { RoleId } from "@shared/index";
import { env } from "./env.js";

export interface LivekitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface LivekitTokenInput {
  code: string;
  playerId: string;
  playerName: string;
  roleId: RoleId | null;
  config: LivekitConfig;
}

export interface LivekitTokenResult {
  url: string;
  token: string;
  roomName: string;
}

export function getLivekitConfigFromEnv(): LivekitConfig | null {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return null;
  }
  return {
    url: env.LIVEKIT_URL,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
  };
}

export function livekitRoomName(code: string): string {
  return `junta-${code.toUpperCase()}`;
}

/** Genera el JWT de LiveKit. El secreto nunca sale del servidor. */
export async function createLivekitToken(
  input: LivekitTokenInput,
): Promise<LivekitTokenResult> {
  const roomName = livekitRoomName(input.code);
  const accessToken = new AccessToken(input.config.apiKey, input.config.apiSecret, {
    identity: input.playerId,
    name: input.playerName,
    ttl: 6 * 60 * 60,
    metadata: JSON.stringify({ roleId: input.roleId, code: input.code }),
  });

  accessToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await accessToken.toJwt();
  return { url: input.config.url, token, roomName };
}
