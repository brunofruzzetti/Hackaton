import { JUDGE_CONFIG, JUDGE_SILENCE_PHRASES } from "@shared/index";
import { getLivekitConfigFromEnv, muteJudgeTracks, unmuteJudgeTracks, type JudgeMuteTarget } from "./livekit.js";
import type { Room, RoomPlayer, RoomStore } from "./roomStore.js";
import type { WsHub } from "./wsHub.js";
import { estimateTextDisplayMs } from "./ai/textTiming.js";

/**
 * Juez omnipresente: no es un personaje del portal. Detecta 4+ humanos hablando
 * a la vez durante 2 s, pide silencio y (opcionalmente) silencia sus micros 3 s.
 */
export class JudgeModerator {
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly store: RoomStore,
    private readonly hub: WsHub,
    private readonly forceMute: boolean,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 500);
    this.timer.unref();
    console.log(
      `[judge] Moderador activo (${JUDGE_CONFIG.OVERLAP_SPEAKERS}+ hablantes, ` +
        `${JUDGE_CONFIG.OVERLAP_MS}ms, mute ${this.forceMute ? "ON" : "OFF"})`,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = Date.now();
      for (const room of this.store.getDiscussionRooms()) {
        // Cuenta tanto la voz humana como el texto que está publicando una IA.
        const speakers = [...room.players.values()].filter(
          (player) => player.speaking && player.connected,
        );

        if (speakers.length < JUDGE_CONFIG.OVERLAP_SPEAKERS) {
          room.overlapSince = 0;
          continue;
        }

        if (room.overlapSince === 0) {
          room.overlapSince = now;
          continue;
        }
        if (now - room.overlapSince < JUDGE_CONFIG.OVERLAP_MS) continue;
        if (now - room.lastJudgeAt < JUDGE_CONFIG.COOLDOWN_MS) continue;

        this.trigger(room, speakers, now);
      }
    } finally {
      this.ticking = false;
    }
  }

  private trigger(room: Room, speakers: RoomPlayer[], now: number): void {
    const phrase =
      JUDGE_SILENCE_PHRASES[Math.floor(Math.random() * JUDGE_SILENCE_PHRASES.length)] ??
      JUDGE_SILENCE_PHRASES[0] ??
      "¡Orden en la sala!";

    const humans = speakers.filter((speaker) => speaker.kind === "human");
    const hasAiText = speakers.some((speaker) => speaker.kind === "ai");

    room.lastJudgeAt = now;
    room.overlapSince = 0;
    room.judgeSpeakingUntil = now + estimateTextDisplayMs(phrase);

    if (hasAiText) {
      // El juez también corta el texto de las IA.
      this.store.cancelAiSpeech(room.code);
    }

    for (const human of humans) {
      human.orderWarnings += 1;
      human.silencedUntil = now + JUDGE_CONFIG.FORCE_MUTE_MS;
    }

    this.store.addTranscriptEntry(room.code, {
      playerId: null,
      playerName: "Juez",
      roleId: null,
      text: `📢 ${phrase}`,
      source: "system",
    });

    this.hub.broadcastRoomState(room.code);
    this.hub.broadcastJudgeText(room.code, phrase, "order");

    console.log(
      `[judge] ${room.code}: ${speakers.length} participante(s) a la vez. Aviso: "${phrase}" ` +
        `(avisos: ${humans.map((human) => `${human.name}=${human.orderWarnings}`).join(", ") || "solo IA"})`,
    );

    if (humans.length > 0) {
      void this.applyLivekitMute(room, humans);
      this.scheduleSilenceEnd(room.code, humans.map((human) => human.id));
    }
  }

  private async applyLivekitMute(room: Room, speakers: RoomPlayer[]): Promise<void> {
    if (!this.forceMute) return;
    const config = getLivekitConfigFromEnv();
    if (!config) {
      console.log("[judge] LiveKit no configurado: el silencio se aplica solo en cliente.");
      return;
    }

    try {
      const targets: JudgeMuteTarget[] = await muteJudgeTracks(
        config,
        `junta-${room.code}`,
        speakers.map((speaker) => speaker.id),
      );
      if (targets.length === 0) return;
      console.log(
        `[judge] ${room.code}: silenciados ${targets.length} tracks de LiveKit durante ` +
          `${JUDGE_CONFIG.FORCE_MUTE_MS}ms`,
      );
      setTimeout(() => {
        void unmuteJudgeTracks(config, `junta-${room.code}`, targets).catch((error: unknown) => {
          console.error("[judge] Error reactivando micros:", error);
        });
      }, JUDGE_CONFIG.FORCE_MUTE_MS).unref();
    } catch (error: unknown) {
      console.warn(
        "[judge] No se pudo silenciar con LiveKit; queda el silencio de cliente:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private scheduleSilenceEnd(code: string, playerIds: readonly string[]): void {
    setTimeout(() => {
      const room = this.store.getRoom(code);
      if (!room) return;
      for (const playerId of playerIds) {
        const player = room.players.get(playerId);
        if (player) player.silencedUntil = null;
      }
      this.hub.broadcastRoomState(code);
      console.log(`[judge] ${code}: fin del silencio forzado`);
    }, JUDGE_CONFIG.FORCE_MUTE_MS).unref();
  }
}
