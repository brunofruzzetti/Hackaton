import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  PlayerTask,
  RoomState,
  SelfState,
  ServerMessage,
  TranscriptEntry,
} from "@shared/index";
import {
  clearSession,
  codeFromUrl,
  loadSession,
  saveSession,
  type Session,
} from "../lib/session";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000, 8000];

function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "type" in value) {
      const type = (value as { type: unknown }).type;
      if (typeof type === "string") {
        return value as ServerMessage;
      }
    }
  } catch {
    // Mensaje corrupto: se ignora.
  }
  return null;
}

function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export interface GameSocket {
  status: ConnectionStatus;
  room: RoomState | null;
  you: SelfState | null;
  session: Session | null;
  tasks: PlayerTask[];
  error: string | null;
  judgeMessage: string | null;
  clearError: () => void;
  showError: (message: string) => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  addAi: () => void;
  removeAi: (playerId: string) => void;
  startGame: () => void;
  startDiscussion: () => void;
  endDiscussion: () => void;
  nextRound: () => void;
  sendChat: (text: string) => void;
  setSpeaking: (speaking: boolean) => void;
  leave: () => void;
}

export function useGameSocket(): GameSocket {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [you, setYou] = useState<SelfState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<PlayerTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null);

  const roomRef = useRef<RoomState | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const judgeTimerRef = useRef<number | null>(null);

  const applyRoom = useCallback((next: RoomState | null) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  function openSocket(action: ClientMessage): void {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const previous = socketRef.current;
    if (previous) {
      previous.onclose = null;
      previous.close();
    }

    setStatus(sessionRef.current ? "reconnecting" : "connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(websocketUrl());
    } catch {
      setStatus("error");
      setError("No se pudo abrir la conexión con el servidor.");
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      attemptsRef.current = 0;
      socket.send(JSON.stringify(action));
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const message = parseServerMessage(event.data);
      if (message) handleServerMessage(message);
    };

    socket.onclose = () => {
      if (socketRef.current !== socket) return;
      socketRef.current = null;
      const session = sessionRef.current;
      if (!session) {
        setStatus("error");
        setError((current) => current ?? "No se pudo conectar con el servidor.");
        return;
      }
      const attempt = attemptsRef.current;
      const delay = RECONNECT_DELAYS_MS[attempt];
      if (delay === undefined) {
        setStatus("error");
        setError("Se ha perdido la conexión con la sala. Recarga la página para volver.");
        return;
      }
      attemptsRef.current = attempt + 1;
      setStatus("reconnecting");
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        openSocket({
          type: "join",
          code: session.code,
          name: session.name,
          playerId: session.playerId,
          token: session.token,
        });
      }, delay);
    };
  }

  function appendTranscriptEntry(entry: TranscriptEntry): void {
    const current = roomRef.current;
    if (!current) return;
    if (current.transcript.some((item) => item.id === entry.id)) return;
    applyRoom({ ...current, transcript: [...current.transcript, entry] });
  }

  function handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case "joined": {
        const session: Session = {
          code: message.state.code,
          playerId: message.you.playerId,
          name: message.you.name,
          token: message.token,
        };
        sessionRef.current = session;
        saveSession(session);
        applyRoom(message.state);
        setYou(message.you);
        setSession(session);
        setTasks(message.tasks ?? []);
        setStatus("connected");
        setError(null);
        if (window.location.pathname !== `/sala/${session.code}`) {
          window.history.replaceState(null, "", `/sala/${session.code}`);
        }
        break;
      }
      case "room_state": {
        applyRoom(message.state);
        break;
      }
      case "transcript_append": {
        appendTranscriptEntry(message.entry);
        break;
      }
      case "tasks_assigned": {
        setTasks(message.tasks);
        setError(null);
        break;
      }
      case "community_event": {
        // El suceso también llega en room_state; aquí se podría disparar sonido.
        break;
      }
      case "round_results": {
        // El room_state posterior incluye el resultado completo.
        break;
      }
      case "neighbor_text": {
        appendTranscriptEntry(message.entry);
        break;
      }
      case "judge_text": {
        setJudgeMessage(message.text);
        if (judgeTimerRef.current !== null) window.clearTimeout(judgeTimerRef.current);
        judgeTimerRef.current = window.setTimeout(() => {
          judgeTimerRef.current = null;
          setJudgeMessage(null);
        }, 7000);
        break;
      }
      case "error": {
        setError(message.message);
        const fatal = [
          "ROOM_NOT_FOUND",
          "NAME_TAKEN",
          "GAME_STARTED",
          "UNAUTHORIZED",
          "ROOM_FULL",
        ].includes(message.code);
        if (fatal && !roomRef.current) {
          setStatus("error");
          sessionRef.current = null;
          setSession(null);
          clearSession();
        }
        break;
      }
      case "notice": {
        setError(message.message);
        break;
      }
      case "pong": {
        break;
      }
    }
  }

  useEffect(() => {
    const stored = loadSession();
    const urlCode = codeFromUrl();
    if (stored && urlCode && stored.code === urlCode) {
      sessionRef.current = stored;
      openSocket({
        type: "join",
        code: stored.code,
        name: stored.name,
        playerId: stored.playerId,
        token: stored.token,
      });
    }

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (judgeTimerRef.current !== null) {
        window.clearTimeout(judgeTimerRef.current);
        judgeTimerRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      sessionRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
    // Solo al montar: la restauración de sesión se hace una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendAction(message: ClientMessage): void {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Sin conexión con la sala. Espera un momento o recarga la página.");
      return;
    }
    socket.send(JSON.stringify(message));
  }

  function createRoom(name: string): void {
    clearSession();
    sessionRef.current = null;
    applyRoom(null);
    setYou(null);
    setSession(null);
    setTasks([]);
    setError(null);
    attemptsRef.current = 0;
    openSocket({ type: "create_room", name });
  }

  function joinRoom(code: string, name: string): void {
    clearSession();
    sessionRef.current = null;
    applyRoom(null);
    setYou(null);
    setSession(null);
    setTasks([]);
    setError(null);
    attemptsRef.current = 0;
    openSocket({ type: "join", code: code.toUpperCase(), name });
  }

  function addAi(): void {
    sendAction({ type: "add_ai" });
  }

  function removeAi(playerId: string): void {
    sendAction({ type: "remove_ai", playerId });
  }

  function startGame(): void {
    sendAction({ type: "start_game" });
  }

  function startDiscussion(): void {
    sendAction({ type: "start_discussion" });
  }

  function endDiscussion(): void {
    sendAction({ type: "end_discussion" });
  }

  function nextRound(): void {
    sendAction({ type: "next_round" });
  }

  function sendChat(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendAction({ type: "chat", text: trimmed });
  }

  function setSpeaking(speaking: boolean): void {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "speaker_state", speaking } satisfies ClientMessage));
  }

  function leave(): void {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave" } satisfies ClientMessage));
    }
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
    sessionRef.current = null;
    clearSession();
    applyRoom(null);
    setYou(null);
    setSession(null);
    setTasks([]);
    setError(null);
    setJudgeMessage(null);
    setStatus("idle");
    window.history.replaceState(null, "", "/");
  }

  return {
    status,
    room,
    you,
    session,
    tasks,
    error,
    judgeMessage,
    clearError: () => setError(null),
    showError: (message: string) => setError(message),
    createRoom,
    joinRoom,
    addAi,
    removeAi,
    startGame,
    startDiscussion,
    endDiscussion,
    nextRound,
    sendChat,
    setSpeaking,
    leave,
  };
}
