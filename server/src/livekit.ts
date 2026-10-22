import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
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

export interface JudgeMuteTarget {
  identity: string;
  trackSid: string;
}

/** El RoomServiceClient habla HTTP(S), no WS. */
function toHttpUrl(url: string): string {
  return url.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
}

/**
 * Silencia las pistas de audio de los participantes indicados usando la API
 * de administración de LiveKit. Devuelve solo las pistas que ha silenciado el
 * juez (no las que el usuario ya tenía silenciadas).
 */
export async function muteJudgeTracks(
  config: LivekitConfig,
  roomName: string,
  identities: readonly string[],
): Promise<JudgeMuteTarget[]> {
  const client = new RoomServiceClient(toHttpUrl(config.url), config.apiKey, config.apiSecret);
  const participants = await client.listParticipants(roomName);
  const targets: JudgeMuteTarget[] = [];

  for (const participant of participants) {
    if (!identities.includes(participant.identity)) continue;
    for (const track of participant.tracks) {
      // TrackType.AUDIO = 0 en el protocolo de LiveKit.
      if (track.type !== 0 || track.muted) continue;
      await client.mutePublishedTrack(roomName, participant.identity, track.sid, true);
      targets.push({ identity: participant.identity, trackSid: track.sid });
    }
  }
  return targets;
}

export async function unmuteJudgeTracks(
  config: LivekitConfig,
  roomName: string,
  targets: readonly JudgeMuteTarget[],
): Promise<void> {
  if (targets.length === 0) return;
  const client = new RoomServiceClient(toHttpUrl(config.url), config.apiKey, config.apiSecret);
  for (const target of targets) {
    try {
      await client.mutePublishedTrack(roomName, target.identity, target.trackSid, false);
    } catch (error: unknown) {
      console.warn(
        `[livekit] No se pudo reactivar el micro de ${target.identity}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
