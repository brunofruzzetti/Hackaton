import { getEffectiveRole } from "@shared/index";
import type { RoomStore } from "../roomStore.js";
import type { WsHub } from "../wsHub.js";
import { estimateTextDisplayMs } from "../ai/textTiming.js";
import { createJudgeService, MockJudgeService, type JudgeService } from "./index.js";
import type { JudgeRoundInput } from "./prompt.js";
import { computeRoundResult } from "./scoring.js";

/**
 * Cuando la sala entra en JUDGMENT, llama al juez final, calcula la ronda en
 * servidor y publica resultados + resumen de texto.
 */
export class JudgeOrchestrator {
  private readonly judge: JudgeService;
  private readonly fallback = new MockJudgeService();
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly store: RoomStore,
    private readonly hub: WsHub,
  ) {
    this.judge = createJudgeService();
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 1000);
    this.timer.unref();
    console.log(`[judge] Orquestador de ronda activo (${this.judge.name})`);
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
      for (const candidate of this.store.getRoomsInPhase("JUDGMENT")) {
        if (candidate.judgePending) continue;
        const room = this.store.beginJudgment(candidate.code);
        if (!room) continue;
        try {
          await this.judgeRoom(room.code);
        } catch (error: unknown) {
          console.error(`[judge] Error juzgando ${room.code}:`, error);
          this.store.releaseJudgment(room.code);
        }
      }
    } finally {
      this.ticking = false;
    }
  }

  private buildInput(roomCode: string): JudgeRoundInput | null {
    const room = this.store.getRoom(roomCode);
    if (!room) return null;

    const players = [...room.players.values()].flatMap((player) => {
      if (player.kind !== "human" || !player.roleId) return [];
      const role = getEffectiveRole(player.roleId, room.presidentStyleId);
      return [
        {
          id: player.id,
          name: player.name,
          roleId: role.id,
          roleName: role.name,
          behaviors: role.expectedBehaviors,
          discrete: role.discrete === true,
          tasks: room.tasksByPlayer.get(player.id) ?? [],
          orderWarnings: player.orderWarnings,
        },
      ];
    });

    if (players.length === 0) return null;

    return {
      code: room.code,
      round: room.round,
      proposal: room.proposal,
      presidentStyleId: room.presidentStyleId,
      transcript: room.transcript,
      players,
      events: room.eventSchedule
        .slice(0, room.eventCursor)
        .map((scheduled) => scheduled.event),
    };
  }

  private async judgeRoom(roomCode: string): Promise<void> {
    const input = this.buildInput(roomCode);
    if (!input) {
      this.store.releaseJudgment(roomCode);
      return;
    }

    let judged;
    let provider = this.judge.name;
    try {
      judged = await this.judge.evaluate(input);
    } catch (error: unknown) {
      console.warn(
        `[judge] Fallo el proveedor ${provider}; se usa el juez mock para no bloquear la partida:`,
        error instanceof Error ? error.message : error,
      );
      judged = await this.fallback.evaluate(input);
      provider = "mock (fallback)";
    }

    const result = computeRoundResult(input, judged);
    const room = this.store.applyRoundResult(roomCode, result);
    this.hub.broadcastRoundResults(roomCode, result);
    this.hub.broadcastRoomState(roomCode);

    const winner = [...room.players.values()]
      .filter((player) => player.kind === "human")
      .sort((a, b) => b.totalPoints - a.totalPoints)[0];
    const best = result.players[0];
    const summary = room.isGameOver
      ? `Acta final. Gana ${winner?.name ?? "la comunidad"} con ${winner?.totalPoints ?? 0} puntos. ` +
        `El resto, a revisar el buzón.`
      : `Acta de la ronda ${result.round}. Mejor vecino: ${best?.playerName ?? "nadie"} ` +
        `con ${best?.totalPoints ?? 0} puntos. ${best?.comentarioGracioso ?? ""}`.slice(0, 300);

    room.judgeSpeakingUntil = Date.now() + estimateTextDisplayMs(summary);
    this.hub.broadcastJudgeText(roomCode, summary, "result");
    console.log(
      `[judge] ${roomCode}: ronda ${result.round} juzgada con ${provider}. ` +
        result.players
          .map((player) => `${player.playerName}=${player.totalPoints}pts`)
          .join(", "),
    );
  }
}
