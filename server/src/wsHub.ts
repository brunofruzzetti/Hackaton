import type { Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  clientMessageSchema,
  type ClientMessage,
  type CommunityEvent,
  type RoleId,
  type RoundResult,
  type ServerErrorCode,
  type ServerMessage,
  type TranscriptEntry,
} from "@shared/index";
import { GameError } from "./errors.js";
import type { RoomStore } from "./roomStore.js";

interface Session {
  code: string;
  playerId: string;
}

function sessionKey(code: string, playerId: string): string {
  return `${code}:${playerId}`;
}

export class WsHub {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<WebSocket, Session>();
  private readonly socketsByPlayer = new Map<string, WebSocket>();
  private readonly alive = new Map<WebSocket, boolean>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor(
    server: Server,
    private readonly store: RoomStore,
  ) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws) => this.onConnection(ws));
    this.wss.on("error", (error) => console.error("[ws] Error del servidor WebSocket:", error));

    this.heartbeat = setInterval(() => this.checkHeartbeat(), 30_000);
    this.heartbeat.unref();
  }

  private onConnection(ws: WebSocket): void {
    this.alive.set(ws, true);
    ws.on("pong", () => this.alive.set(ws, true));
    ws.on("message", (data) => {
      void this.onMessage(ws, data);
    });
    ws.on("close", () => this.onClose(ws));
    ws.on("error", (error) => {
      console.error("[ws] Error de socket:", error.message);
    });
    console.log("[ws] Nueva conexión WebSocket");
  }

  private async onMessage(ws: WebSocket, data: RawData): Promise<void> {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data.toString());
    } catch {
      this.sendError(ws, "INVALID_MESSAGE", "El mensaje no es JSON válido.");
      return;
    }

    const parsed = clientMessageSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message ?? "Mensaje no válido.";
      this.sendError(ws, "INVALID_MESSAGE", detail);
      return;
    }

    const message: ClientMessage = parsed.data;

    try {
      switch (message.type) {
        case "create_room": {
          if (this.sessions.has(ws)) {
            this.sendError(ws, "INVALID_MESSAGE", "Ya estás dentro de una sala.");
            return;
          }
          const result = this.store.createRoom(message.name);
          this.register(ws, result.room.code, result.player.id);
          this.send(ws, {
            type: "joined",
            state: this.store.getPublicState(result.room),
            you: {
              playerId: result.player.id,
              name: result.player.name,
              isHost: result.player.isHost,
            },
            token: result.token,
            tasks: this.store.getTasksForPlayer(result.room.code, result.player.id),
          });
          this.broadcastRoom(result.room.code);
          return;
        }

        case "join": {
          if (this.sessions.has(ws)) {
            if (message.playerId && this.sessions.get(ws)?.playerId === message.playerId) {
              this.send(ws, {
                type: "notice",
                message: "Ya estabas dentro de esta sala.",
              });
              return;
            }
            this.sendError(ws, "INVALID_MESSAGE", "Ya estás dentro de una sala.");
            return;
          }
          const result = this.store.joinRoom({
            code: message.code,
            name: message.name,
            playerId: message.playerId,
            token: message.token,
          });
          this.register(ws, result.room.code, result.player.id);
          this.send(ws, {
            type: "joined",
            state: this.store.getPublicState(result.room),
            you: {
              playerId: result.player.id,
              name: result.player.name,
              isHost: result.player.isHost,
            },
            token: result.token,
            tasks: this.store.getTasksForPlayer(result.room.code, result.player.id),
          });
          this.broadcastRoom(result.room.code);
          return;
        }

        case "ping": {
          this.send(ws, { type: "pong", at: Date.now() });
          return;
        }

        default:
          break;
      }

      const session = this.sessions.get(ws);
      if (!session) {
        this.sendError(ws, "UNAUTHORIZED", "Primero tienes que entrar en una sala.");
        return;
      }

      switch (message.type) {
        case "add_ai": {
          this.store.addAi(session.code, session.playerId);
          this.broadcastRoom(session.code);
          return;
        }
        case "remove_ai": {
          this.store.removeAi(session.code, session.playerId, message.playerId);
          this.broadcastRoom(session.code);
          return;
        }
        case "start_game": {
          this.store.startGame(session.code, session.playerId);
          this.broadcastRoom(session.code);
          return;
        }
        case "start_discussion": {
          this.store.startDiscussion(session.code, session.playerId);
          this.broadcastRoom(session.code);
          this.sendTasks(session.code);
          return;
        }
        case "end_discussion": {
          this.store.endDiscussion(session.code, session.playerId);
          this.broadcastRoom(session.code);
          return;
        }
        case "next_round": {
          this.store.startNextRound(session.code, session.playerId);
          this.broadcastRoom(session.code);
          this.sendTasks(session.code);
          return;
        }
        case "chat": {
          const entry = this.store.chat(session.code, session.playerId, message.text);
          this.broadcast(session.code, { type: "transcript_append", entry });
          return;
        }
        case "speaker_state": {
          const changed = this.store.setSpeaking(
            session.code,
            session.playerId,
            message.speaking,
          );
          if (changed) {
            this.broadcastRoom(session.code);
          }
          return;
        }
        case "leave": {
          this.leave(ws, session);
          return;
        }
        default:
          return;
      }
    } catch (error: unknown) {
      if (error instanceof GameError) {
        this.sendError(ws, error.code, error.message);
        return;
      }
      console.error("[ws] Error inesperado procesando mensaje:", error);
      this.sendError(ws, "SERVER_ERROR", "Algo ha fallado en el servidor. Inténtalo de nuevo.");
    }
  }

  private register(ws: WebSocket, code: string, playerId: string): void {
    const key = sessionKey(code, playerId);
    const previous = this.socketsByPlayer.get(key);
    if (previous && previous !== ws) {
      console.log(`[ws] Cerrando socket anterior de ${playerId} (reconexión)`);
      this.sessions.delete(previous);
      previous.close(4001, "Reconectado en otra pestaña");
    }
    this.sessions.set(ws, { code, playerId });
    this.socketsByPlayer.set(key, ws);
  }

  private onClose(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    this.alive.delete(ws);
    if (!session) return;

    const key = sessionKey(session.code, session.playerId);
    if (this.socketsByPlayer.get(key) !== ws) {
      return; // El jugador ya se reconectó con otro socket.
    }
    this.socketsByPlayer.delete(key);

    const changed = this.store.disconnect(session.code, session.playerId);
    if (changed) {
      this.broadcastRoom(session.code);
    } else {
      console.log(`[ws] Socket cerrado para ${session.playerId} (sala ${session.code})`);
    }
  }

  private leave(ws: WebSocket, session: Session): void {
    const key = sessionKey(session.code, session.playerId);
    if (this.socketsByPlayer.get(key) === ws) {
      this.socketsByPlayer.delete(key);
    }
    this.sessions.delete(ws);
    this.store.disconnect(session.code, session.playerId);
    this.broadcastRoom(session.code);
    ws.close(1000, "Has salido de la sala");
    console.log(`[ws] ${session.playerId} salió de ${session.code}`);
  }

  /** Difunde una entrada de transcripción ya creada (voz transcrita, sistema...). */
  broadcastTranscript(code: string, entry: TranscriptEntry): void {
    this.broadcast(code, { type: "transcript_append", entry });
  }

  /** Expuesto para el director de IA y el reloj de fases. */
  broadcastRoomState(code: string): void {
    this.broadcastRoom(code);
  }

  broadcastNeighborText(
    code: string,
    entry: TranscriptEntry,
    playerId: string,
    roleId: RoleId,
  ): void {
    this.broadcast(code, {
      type: "neighbor_text",
      entry,
      playerId,
      roleId,
    });
  }

  broadcastCommunityEvent(code: string, event: CommunityEvent): void {
    this.broadcast(code, { type: "community_event", event });
  }

  broadcastJudgeText(
    code: string,
    text: string,
    kind: "order" | "result" | "event",
  ): void {
    this.broadcast(code, { type: "judge_text", text, kind });
  }

  broadcastRoundResults(code: string, result: RoundResult): void {
    this.broadcast(code, { type: "round_results", result });
  }

  /** Envía a cada humano su agenda privada (nunca a los demás). */
  sendTasks(code: string): void {
    const room = this.store.getRoom(code);
    if (!room) return;
    for (const player of room.players.values()) {
      if (player.kind !== "human") continue;
      const socket = this.socketsByPlayer.get(sessionKey(code, player.id));
      if (!socket) continue;
      this.send(socket, {
        type: "tasks_assigned",
        round: room.round,
        tasks: this.store.getTasksForPlayer(code, player.id),
      });
    }
  }

  private broadcastRoom(code: string): void {
    try {
      const state = this.store.getPublicState(this.store.getRoomOrThrow(code));
      this.broadcast(code, { type: "room_state", state });
    } catch (error: unknown) {
      if (error instanceof GameError) {
        console.log(`[ws] No se difunde ${code}: ${error.message}`);
        return;
      }
      console.error("[ws] Error construyendo el estado de sala:", error);
    }
  }

  private broadcast(code: string, message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const [ws, session] of this.sessions) {
      if (session.code === code && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.send(ws, { type: "error", code, message });
  }

  private checkHeartbeat(): void {
    for (const [ws, alive] of this.alive) {
      if (!alive) {
        console.log("[ws] Terminando socket sin respuesta de ping");
        ws.terminate();
        continue;
      }
      this.alive.set(ws, false);
      ws.ping();
    }
  }
}
