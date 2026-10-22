import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_CONFIG } from "@shared/index";
import type { LocalAudioTrack } from "livekit-client";
import { ApiError, uploadClip } from "../lib/api";
import type { Session } from "../lib/session";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface PushToTalkProps {
  session: Session;
  localTrack: LocalAudioTrack | null;
  disabled: boolean;
  disabledReason: string;
  onError: (message: string) => void;
}

/**
 * Push-to-talk: mantén pulsado para grabar un clip con el mismo micrófono de LiveKit.
 * Al soltar se sube al servidor y la transcripción se difunde por WebSocket.
 */
export function PushToTalk({
  session,
  localTrack,
  disabled,
  disabledReason,
  onError,
}: PushToTalkProps) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef("");
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const stopRef = useRef<() => void>(() => undefined);
  const startRef = useRef<() => void>(() => undefined);

  const clearTimers = useCallback((): void => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const uploadBlob = useCallback(
    async (clip: Blob, durationMs: number): Promise<void> => {
      setUploading(true);
      setLocalError(null);
      try {
        try {
          await uploadClip(session, clip, durationMs);
        } catch (firstError: unknown) {
          const retryable =
            !(firstError instanceof ApiError) || firstError.status >= 500;
          if (!retryable) throw firstError;
          await delay(600);
          await uploadClip(session, clip, durationMs);
        }
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo transcribir el clip. Inténtalo de nuevo.";
        setLocalError(message);
        onError(message);
      } finally {
        if (mountedRef.current) setUploading(false);
      }
    },
    [session, onError],
  );

  const stop = useCallback((): void => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const start = useCallback((): void => {
    if (disabled || recording || uploading) return;
    const mediaTrack = localTrack?.mediaStreamTrack;
    if (!mediaTrack || mediaTrack.readyState !== "live") {
      setLocalError("Micrófono no disponible. Comprueba los permisos del navegador.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setLocalError("Este navegador no soporta grabación de audio.");
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        new MediaStream([mediaTrack]),
        mimeType ? { mimeType } : undefined,
      );
    } catch {
      setLocalError("No se pudo iniciar la grabación en este navegador.");
      return;
    }

    chunksRef.current = [];
    recorderMimeRef.current = recorder.mimeType || mimeType || "audio/webm";
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearTimers();
      const durationMs = Date.now() - startedAtRef.current;
      const chunks = chunksRef.current;
      chunksRef.current = [];
      recorderRef.current = null;
      setRecording(false);
      if (durationMs < 400 || chunks.length === 0) {
        return;
      }
      const clip = new Blob(chunks, { type: recorderMimeRef.current });
      void uploadBlob(clip, durationMs);
    };

    recorderRef.current = recorder;
    chunksRef.current = [];
    startedAtRef.current = Date.now();
    try {
      recorder.start(250);
    } catch {
      recorderRef.current = null;
      setLocalError("No se pudo iniciar la grabación.");
      return;
    }
    setLocalError(null);
    setElapsedMs(0);
    setRecording(true);
    tickTimerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    maxTimerRef.current = window.setTimeout(() => {
      stopRef.current();
    }, AUDIO_CONFIG.MAX_CLIP_MS);
  }, [disabled, recording, uploading, localTrack, clearTimers, uploadBlob]);

  useEffect(() => {
    startRef.current = start;
    stopRef.current = stop;
  }, [start, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!recording) return;
    const handleRelease = (): void => stopRef.current();
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("pointercancel", handleRelease);
    return () => {
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("pointercancel", handleRelease);
    };
  }, [recording]);

  const seconds = (elapsedMs / 1000).toFixed(1);
  const blocked = disabled || uploading;
  const label = uploading
    ? "Transcribiendo…"
    : recording
      ? `Suelta para enviar · ${seconds} s`
      : disabled
        ? "Push-to-talk no disponible"
        : "Mantén pulsado para hablar";

  return (
    <div className="ptt">
      <button
        className={`ptt-button ${recording ? "recording" : ""} ${uploading ? "uploading" : ""}`}
        type="button"
        disabled={blocked}
        aria-label="Push to talk: mantén pulsado para grabar y suelta para enviar"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          startRef.current();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          stopRef.current();
        }}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            startRef.current();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            stopRef.current();
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="ptt-icon" aria-hidden="true">
          {uploading ? "…" : recording ? "■" : "🎙️"}
        </span>
        <span>{label}</span>
      </button>
      <p className="hint center">
        {disabled
          ? disabledReason
          : "Mantén pulsado mientras hablas. Al soltar, el clip se transcribe y aparece en el acta."}
      </p>
      {localError && <p className="hint warn center">{localError}</p>}
    </div>
  );
}
