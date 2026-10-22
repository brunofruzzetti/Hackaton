import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RuinaClientMessage,
  RuinaPrivateInfo,
  RuinaServerMessage,
  RuinaState,
} from "@shared/index";
import {
  clearSession,
  codeFromUrl,
  loadSession,
  saveSession,
  type Session,
} from "../lib/session";

export type RuinaConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 8000, 8000];

function parseServerMessage(raw: string): RuinaServerMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "type" in value) {
      const type = (value as { type: unknown }).type;
      if (typeof type === "string") return value as RuinaServerMessage;
    }
  } catch {
    // ignorado
  }
  return null;
}

function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export interface RuinaSelf {
  playerId: string;
  nombre: string;
  isHost: boolean;
}

export interface RuinaSocket {
  status: RuinaConnectionStatus;
  room: RuinaState | null;
  you: RuinaSelf | null;
  session: Session | null;
  privateInfo: RuinaPrivateInfo | null;
  error: string | null;
  clearError: () => void;
  showError: (message: string) => void;
  createRoom: (nombre: string) => void;
  joinRoom: (code: string, nombre: string) => void;
  startGame: () => void;
  forceAdvance: () => void;
  nominate: (vocalId: string) => void;
  vote: (approve: boolean) => void;
  sign: (choice: "LIMPIO" | "SABOTAJE") => void;
  sendChat: (text: string) => void;
  leave: () => void;
}

export function useRuinaSocket(): RuinaSocket {
  const [status, setStatus] = useState<RuinaConnectionStatus>("idle");
  const [room, setRoom] = useState<RuinaState | null>(null);
  const [you, setYou] = useState<RuinaSelf | null>(null);
  const [privateInfo, setPrivateInfo] = useState<RuinaPrivateInfo | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<RuinaState | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const applyRoom = useCallback((next: RuinaState | null) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  function openSocket(action: RuinaClientMessage): void {
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
      const stored = sessionRef.current;
      if (!stored) {
        setStatus("error");
        setError((current) => current ?? "No se pudo conectar con el servidor.");
        return;
      }
      const attempt = attemptsRef.current;
      const delay = RECONNECT_DELAYS[attempt];
      if (delay === undefined) {
        setStatus("error");
        setError("Se ha perdido la conexión. Recarga la página para volver.");
        return;
      }
      attemptsRef.current = attempt + 1;
      setStatus("reconnecting");
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        openSocket({
          type: "join",
          code: stored.code,
          nombre: stored.name,
          playerId: stored.playerId,
          token: stored.token,
        });
      }, delay);
    };
  }

  function handleServerMessage(message: RuinaServerMessage): void {
    switch (message.type) {
      case "joined": {
        const nextSession: Session = {
          code: message.state.code,
          playerId: message.you.playerId,
          name: message.you.nombre,
          token: message.token,
        };
        sessionRef.current = nextSession;
        saveSession(nextSession);
        applyRoom(message.state);
        setYou(message.you);
        setSession(nextSession);
        setPrivateInfo(message.privateInfo);
        setStatus("connected");
        setError(null);
        if (window.location.pathname !== `/sala/${nextSession.code}`) {
          window.history.replaceState(null, "", `/sala/${nextSession.code}`);
        }
        break;
      }
      case "private_info": {
        setPrivateInfo(message.privateInfo);
        break;
      }
      case "room_state": {
        applyRoom(message.state);
        break;
      }
      case "chat_message": {
        const current = roomRef.current;
        if (!current) break;
        if (current.chat.some((item) => item.id === message.message.id)) break;
        applyRoom({ ...current, chat: [...current.chat, message.message] });
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
        nombre: stored.name,
        playerId: stored.playerId,
        token: stored.token,
      });
    }

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      sessionRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendAction(message: RuinaClientMessage): void {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Sin conexión con la sala. Espera un momento.");
      return;
    }
    socket.send(JSON.stringify(message));
  }

  function createRoom(nombre: string): void {
    clearSession();
    sessionRef.current = null;
    applyRoom(null);
    setYou(null);
    setSession(null);
    setPrivateInfo(null);
    setError(null);
    attemptsRef.current = 0;
    openSocket({ type: "create_room", nombre });
  }

  function joinRoom(code: string, nombre: string): void {
    clearSession();
    sessionRef.current = null;
    applyRoom(null);
    setYou(null);
    setSession(null);
    setPrivateInfo(null);
    setError(null);
    attemptsRef.current = 0;
    openSocket({ type: "join", code: code.toUpperCase(), nombre });
  }

  function startGame(): void {
    sendAction({ type: "start_game" });
  }

  function forceAdvance(): void {
    sendAction({ type: "force_advance" });
  }

  function nominate(vocalId: string): void {
    sendAction({ type: "nominate", vocalId });
  }

  function vote(approve: boolean): void {
    sendAction({ type: "vote_commission", approve });
  }

  function sign(choice: "LIMPIO" | "SABOTAJE"): void {
    sendAction({ type: "sign_contract", choice });
  }

  function sendChat(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendAction({ type: "chat", text: trimmed });
  }

  function leave(): void {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave" } satisfies RuinaClientMessage));
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
    setPrivateInfo(null);
    setError(null);
    setStatus("idle");
    window.history.replaceState(null, "", "/");
  }

  return {
    status,
    room,
    you,
    session,
    privateInfo,
    error,
    clearError: () => setError(null),
    showError: (message: string) => setError(message),
    createRoom,
    joinRoom,
    startGame,
    forceAdvance,
    nominate,
    vote,
    sign,
    sendChat,
    leave,
  };
}
