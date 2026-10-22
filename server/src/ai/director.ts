import { AI_CONFIG } from "@shared/index";
import type { Room, RoomStore } from "../roomStore.js";
import type { WsHub } from "../wsHub.js";
import type { LlmService } from "./llm.js";
import { buildNeighborPrompt } from "./prompt.js";
import { estimateSpeechMs, getAiVoiceProfile } from "./voices.js";

/**
 * Director de vecinos IA: decide cuándo habla cada uno y garantiza que nunca
 * hablen dos IA a la vez ni pisen a un humano que acaba de empezar.
 */
export class AiDirector {
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly store: RoomStore,
    private readonly hub: WsHub,
    private readonly llm: LlmService,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 1000);
    this.timer.unref();
    console.log(`[ai] Director activo (proveedor: ${this.llm.name})`);
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
      const rooms = this.store.getDiscussionRooms();
      await Promise.allSettled(rooms.map((room) => this.tickRoom(room)));
    } finally {
      this.ticking = false;
    }
  }

  private async tickRoom(room: Room): Promise<void> {
    const now = Date.now();
    if (room.phase !== "DISCUSSION") return;

    // Turno de IA en curso: esperar a que termine.
    if (room.aiSpeakingPlayerId) {
      if (now < room.aiSpeakingUntil) return;
      this.store.finishAiSpeech(room.code);
      this.hub.broadcastRoomState(room.code);
      return;
    }

    if (room.aiGenerationPending) return;
    if (now < room.aiNextAttemptAt) return;
    if (room.judgeSpeakingUntil > now) return;

    const humansSpeaking = [...room.players.values()].some(
      (player) => player.kind === "human" && player.speaking,
    );
    if (humansSpeaking) return;
    if (now - room.lastHumanSpokeAt < AI_CONFIG.SILENCE_AFTER_HUMAN_MS) return;
    if (now - room.lastAiSpokeAt < AI_CONFIG.MIN_GAP_MS) return;

    const candidates = [...room.players.values()].filter(
      (player) =>
        player.kind === "ai" &&
        player.roleId !== null &&
        (room.aiTurns.get(player.id) ?? 0) < AI_CONFIG.MAX_TURNS_PER_ROUND,
    );
    if (candidates.length === 0) return;

    const index = room.aiTurnCursor % candidates.length;
    const ai = candidates[index];
    room.aiTurnCursor += 1;
    if (!ai || !ai.roleId) return;

    const token = room.aiGenerationToken + 1;
    room.aiGenerationToken = token;
    room.aiGenerationPending = true;

    try {
      const players = [...room.players.values()].map((player) => ({
        name: player.name,
        roleId: player.roleId,
        kind: player.kind,
      }));
      const presidentName =
        players.find((player) => player.roleId === "president")?.name ?? null;

      const prompt = buildNeighborPrompt({
        playerName: ai.name,
        roleId: ai.roleId,
        presidentStyleId: room.presidentStyleId,
        proposal: room.proposal,
        transcript: room.transcript,
        players,
        presidentName,
      });

      const text = await this.llm.generateNeighborLine({
        ...prompt,
        roleId: ai.roleId,
        playerName: ai.name,
        proposal: room.proposal,
      });

      if (!text) {
        room.aiNextAttemptAt = Date.now() + 5000;
        return;
      }

      // Un humano ha tomado la palabra o la fase ha cambiado mientras generábamos.
      if (
        room.phase !== "DISCUSSION" ||
        room.aiGenerationToken !== token ||
        Date.now() - room.lastHumanSpokeAt < 1200
      ) {
        console.log(`[ai] Intervención descartada en ${room.code} (interrupción humana)`);
        return;
      }

      const duration = estimateSpeechMs(text);
      const voice = ai.voiceProfile ?? getAiVoiceProfile(0, ai.name);
      const { entry } = this.store.startAiSpeech(room.code, ai.id, text, duration);
      this.hub.broadcastRoomState(room.code);
      this.hub.broadcastNeighborSays(room.code, entry, ai.id, ai.roleId, voice);
      console.log(
        `[ai] ${ai.name}@${room.code} empieza a hablar (${duration}ms): "${text.slice(0, 120)}"`,
      );
    } catch (error: unknown) {
      console.error(`[ai] Error en la intervención de ${ai.name}@${room.code}:`, error);
      room.aiNextAttemptAt = Date.now() + 5000;
    } finally {
      room.aiGenerationPending = false;
    }
  }
}
