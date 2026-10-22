import type { Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  ruinaClientMessageSchema,
  type RuinaClientMessage,
  type RuinaErrorCode,
  type RuinaServerMessage,
} from "@shared/index";
import { GameError } from "./errors.js";
import type { RuinaStore } from "./ruinaStore.js";
import type { SupabaseMirror } from "./supabaseMirror.js";

interface Session {
  code: string;
  playerId: string;
}

function key(code: string, playerId: string): string {
  return `${code}:${playerId}`;
}

export class RuinaWsHub {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<WebSocket, Session>();
  private readonly socketsByPlayer = new Map<string, WebSocket>();
  private readonly alive = new Map<WebSocket, boolean>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor(
    server: Server,
    private readonly store: RuinaStore,
    private readonly mirror: SupabaseMirror | null = null,
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
    this.wss.on("error", (error) => console.error("[ruina/ws] Error:", error));

    this.heartbeat = setInterval(() => this.checkHeartbeat(), 30_000);
    this.heartbeat.unref();
  }

  private onConnection(ws: WebSocket): void {
    this.alive.set(ws, true);
    ws.on("pong", () => this.alive.set(ws, true));
    ws.on("message", (data) => void this.onMessage(ws, data));
    ws.on("close", () => this.onClose(ws));
    ws.on("error", (error) => console.error("[ruina/ws] Socket:", error.message));
  }

  private async onMessage(ws: WebSocket, data: RawData): Promise<void> {
    let json: unknown;
    try {
      json = JSON.parse(data.toString());
    } catch {
      this.sendError(ws, "INVALID_MESSAGE", "El mensaje no es JSON válido.");
      return;
    }

    const parsed = ruinaClientMessageSchema.safeParse(json);
    if (!parsed.success) {
      this.sendError(
        ws,
        "INVALID_MESSAGE",
        parsed.error.issues[0]?.message ?? "Mensaje no válido.",
      );
      return;
    }

    const message: RuinaClientMessage = parsed.data;

    try {
      switch (message.type) {
        case "create_room": {
          if (this.sessions.has(ws)) {
            this.sendError(ws, "INVALID_MESSAGE", "Ya estás dentro de una sala.");
            return;
          }
          const result = this.store.createRoom(message.nombre);
          this.register(ws, result.room.code, result.player.id);
          this.sendJoined(ws, result.room.code, result.player.id, result.token);
          this.broadcastState(result.room.code);
          return;
        }
        case "join": {
          if (this.sessions.has(ws)) {
            this.sendError(ws, "INVALID_MESSAGE", "Ya estás dentro de una sala.");
            return;
          }
          const result = this.store.joinRoom({
            code: message.code,
            nombre: message.nombre,
            playerId: message.playerId,
            token: message.token,
          });
          this.register(ws, result.room.code, result.player.id);
          this.sendJoined(ws, result.room.code, result.player.id, result.token);
          this.broadcastState(result.room.code);
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
        case "start_game": {
          this.store.startGame(session.code, session.playerId);
          this.broadcastState(session.code);
          this.sendPrivateInfos(session.code);
          return;
        }
        case "nominate": {
          this.store.nominate(session.code, session.playerId, message.vocalId);
          this.broadcastState(session.code);
          return;
        }
        case "vote_commission": {
          this.store.voteCommission(session.code, session.playerId, message.approve);
          this.broadcastState(session.code);
          return;
        }
        case "sign_contract": {
          this.store.signContract(session.code, session.playerId, message.choice);
          this.broadcastState(session.code);
          return;
        }
        case "chat": {
          const chatMessage = this.store.chat(session.code, session.playerId, message.text);
          this.broadcast(session.code, { type: "chat_message", message: chatMessage });
          const room = this.store.getRoom(session.code);
          if (room) void this.mirror?.publish(room, this.store.getPublicState(room));
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
        this.sendError(ws, error.code as RuinaErrorCode, error.message);
        return;
      }
      console.error("[ruina/ws] Error inesperado:", error);
      this.sendError(ws, "SERVER_ERROR", "Algo ha fallado en el servidor.");
    }
  }

  /** Llamado por el reloj del servidor cuando cambian fases por timeout. */
  broadcastState(code: string): void {
    const room = this.store.getRoom(code);
    if (!room) return;
    const state = this.store.getPublicState(room);
    this.broadcast(code, { type: "room_state", state });
    void this.mirror?.publish(room, state);
  }

  private sendJoined(ws: WebSocket, code: string, playerId: string, token: string): void {
    const room = this.store.getRoom(code);
    if (!room) return;
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return;
    this.send(ws, {
      type: "joined",
      state: this.store.getPublicState(room),
      you: { playerId, nombre: player.nombre, isHost: player.isHost },
      token,
      privateInfo: this.store.getPrivateInfo(room, playerId),
    });
  }

  private sendPrivateInfos(code: string): void {
    const room = this.store.getRoom(code);
    if (!room) return;
    for (const player of room.players) {
      const socket = this.socketsByPlayer.get(key(code, player.id));
      if (!socket) continue;
      const privateInfo = this.store.getPrivateInfo(room, player.id);
      if (privateInfo) this.send(socket, { type: "private_info", privateInfo });
    }
  }

  private register(ws: WebSocket, code: string, playerId: string): void {
    const k = key(code, playerId);
    const previous = this.socketsByPlayer.get(k);
    if (previous && previous !== ws) {
      this.sessions.delete(previous);
      previous.close(4001, "Reconectado en otra pestaña");
    }
    this.sessions.set(ws, { code, playerId });
    this.socketsByPlayer.set(k, ws);
  }

  private onClose(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    this.alive.delete(ws);
    if (!session) return;
    const k = key(session.code, session.playerId);
    if (this.socketsByPlayer.get(k) !== ws) return;
    this.socketsByPlayer.delete(k);
    this.store.disconnect(session.code, session.playerId);
    this.broadcastState(session.code);
  }

  private leave(ws: WebSocket, session: Session): void {
    const k = key(session.code, session.playerId);
    if (this.socketsByPlayer.get(k) === ws) this.socketsByPlayer.delete(k);
    this.sessions.delete(ws);
    this.store.disconnect(session.code, session.playerId);
    this.broadcastState(session.code);
    ws.close(1000, "Has salido");
  }

  private broadcast(code: string, message: RuinaServerMessage): void {
    const payload = JSON.stringify(message);
    for (const [ws, session] of this.sessions) {
      if (session.code === code && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private send(ws: WebSocket, message: RuinaServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, code: RuinaErrorCode, message: string): void {
    this.send(ws, { type: "error", code, message });
  }

  private checkHeartbeat(): void {
    for (const [ws, alive] of this.alive) {
      if (!alive) {
        ws.terminate();
        continue;
      }
      this.alive.set(ws, false);
      ws.ping();
    }
  }
}
