import { describe, expect, it } from "vitest";
import { createLivekitToken, livekitRoomName } from "./livekit.js";

function decodePayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  expect(parts).toHaveLength(3);
  const payload = parts[1];
  if (!payload) throw new Error("Token sin payload");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}

describe("LiveKit", () => {
  it("genera un nombre de sala estable por código", () => {
    expect(livekitRoomName("abcd")).toBe("junta-ABCD");
  });

  it("genera un JWT con identidad y permisos de la sala correcta", async () => {
    const result = await createLivekitToken({
      code: "ABCD",
      playerId: "player-1",
      playerName: "Ana",
      config: {
        url: "ws://localhost:7880",
        apiKey: "devkey",
        apiSecret: "secret",
      },
    });

    expect(result.url).toBe("ws://localhost:7880");
    expect(result.roomName).toBe("junta-ABCD");

    const payload = decodePayload(result.token);
    expect(payload.sub).toBe("player-1");
    expect(payload.name).toBe("Ana");
    const video = payload.video as Record<string, unknown>;
    expect(video.room).toBe("junta-ABCD");
    expect(video.roomJoin).toBe(true);
    expect(video.canPublish).toBe(true);
    expect(video.canSubscribe).toBe(true);
    expect(payload.metadata).toContain("ABCD");
  });
});
