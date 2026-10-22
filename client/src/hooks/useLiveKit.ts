import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type LocalAudioTrack,
  type Participant,
  type RemoteTrack,
} from "livekit-client";
import { ApiError, requestLivekitToken } from "../lib/api";
import type { Session } from "../lib/session";

export type AudioStatus = "idle" | "connecting" | "connected" | "error" | "disabled";

export interface LiveKitAudio {
  status: AudioStatus;
  error: string | null;
  muted: boolean;
  /** true solo cuando el juez ha silenciado al jugador. */
  judgeMuted: boolean;
  localTrack: LocalAudioTrack | null;
  speakingIds: string[];
  canPlaybackAudio: boolean;
  toggleMute: () => Promise<void>;
  enablePlayback: () => Promise<void>;
  retry: () => void;
  clearError: () => void;
}

interface UseLiveKitOptions {
  session: Session | null;
  enabled: boolean;
  onSpeakingChange: (speaking: boolean) => void;
  silencedUntil?: number | null;
}

function friendlyAudioError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Permiso de micrófono denegado. Actívalo en los ajustes del navegador y reintenta.";
    }
    if (error.name === "NotFoundError") {
      return "No se ha encontrado ningún micrófono en este dispositivo.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo conectar el audio de la sala.";
}

/**
 * Conecta al room de LiveKit de la sala, publica el micrófono y mantiene
 * el indicador de hablantes. Los clips de push-to-talk usan el mismo track.
 */
export function useLiveKit({
  session,
  enabled,
  onSpeakingChange,
  silencedUntil = null,
}: UseLiveKitOptions): LiveKitAudio {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [judgeMuted, setJudgeMuted] = useState(false);
  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const trackRef = useRef<LocalAudioTrack | null>(null);
  const mutedRef = useRef(false);
  const judgeMutedRef = useRef(false);
  const judgeMuteTimerRef = useRef<number | null>(null);
  const speakingCallbackRef = useRef(onSpeakingChange);
  speakingCallbackRef.current = onSpeakingChange;

  useEffect(() => {
    if (!enabled || !session) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const activeSession = session;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    roomRef.current = room;
    setStatus("connecting");
    setError(null);
    setMuted(false);
    mutedRef.current = false;
    setJudgeMuted(false);
    judgeMutedRef.current = false;
    setLocalTrack(null);
    setSpeakingIds([]);
    setCanPlaybackAudio(true);

    const audioContainer = document.createElement("div");
    audioContainer.dataset.juntaAudio = "true";
    audioContainer.style.display = "none";
    document.body.appendChild(audioContainer);

    const handleSpeakers = (speakers: Participant[]): void => {
      const ids = speakers.map((participant) => participant.identity);
      setSpeakingIds(ids);
      const selfSpeaking = ids.includes(activeSession.playerId) && !mutedRef.current;
      speakingCallbackRef.current(selfSpeaking);
    };

    const handleTrackSubscribed = (track: RemoteTrack): void => {
      if (track.kind !== Track.Kind.Audio) return;
      const element = track.attach();
      element.autoplay = true;
      audioContainer.appendChild(element);
    };

    const handleTrackUnsubscribed = (track: RemoteTrack): void => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((element) => element.remove());
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleSpeakers);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => setCanPlaybackAudio(playing));
    room.on(RoomEvent.Reconnecting, () => {
      if (!cancelled) setStatus("connecting");
    });
    room.on(RoomEvent.Reconnected, () => {
      if (!cancelled) setStatus("connected");
    });
    room.on(RoomEvent.MediaDevicesError, (deviceError) => {
      if (!cancelled) setError(friendlyAudioError(deviceError));
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) {
        setStatus("error");
        setError("Se ha cortado la conexión de audio. Vuelve a intentarlo.");
      }
    });

    async function setup(): Promise<void> {
      try {
        const credentials = await requestLivekitToken(activeSession);
        if (cancelled) return;

        await room.connect(credentials.url, credentials.token, { autoSubscribe: true });
        if (cancelled) {
          room.disconnect();
          return;
        }
        setStatus("connected");

        try {
          const track = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          if (cancelled) {
            track.stop();
            room.disconnect();
            return;
          }
          await room.localParticipant.publishTrack(track);
          if (cancelled) {
            track.stop();
            return;
          }
          trackRef.current = track;
          setLocalTrack(track);
        } catch (micError: unknown) {
          // La sala de audio funciona (puedes oír), pero no puedes publicar micro.
          if (!cancelled) setError(friendlyAudioError(micError));
        }

        try {
          await room.startAudio();
        } catch {
          // El navegador exige un gesto: se muestra el botón "Activar sonido".
        }
        if (!cancelled) setCanPlaybackAudio(room.canPlaybackAudio);
      } catch (setupError: unknown) {
        if (cancelled) return;
        room.disconnect();
        if (setupError instanceof ApiError && setupError.status === 503) {
          setStatus("disabled");
          setError(
            "El audio no está configurado en el servidor. Puedes seguir con el chat de texto.",
          );
        } else {
          setStatus("error");
          setError(friendlyAudioError(setupError));
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      speakingCallbackRef.current(false);
      room.removeAllListeners();
      trackRef.current?.stop();
      trackRef.current = null;
      room.disconnect();
      roomRef.current = null;
      audioContainer.remove();
      setLocalTrack(null);
      setSpeakingIds([]);
      setMuted(false);
      mutedRef.current = false;
      setJudgeMuted(false);
      judgeMutedRef.current = false;
      if (judgeMuteTimerRef.current !== null) {
        window.clearTimeout(judgeMuteTimerRef.current);
        judgeMuteTimerRef.current = null;
      }
      setStatus("idle");
    };
  }, [enabled, session, retryKey]);

  const muteForJudge = useCallback(async (untilMs: number): Promise<void> => {
    const remaining = untilMs - Date.now();
    if (remaining <= 0) return;
    const track = trackRef.current;
    if (!track) return;

    // Si el jugador ya estaba silenciado a mano, no lo reactivamos al acabar.
    if (!judgeMutedRef.current && mutedRef.current) return;

    if (!judgeMutedRef.current) {
      try {
        await track.mute();
        judgeMutedRef.current = true;
        setJudgeMuted(true);
        setMuted(true);
        speakingCallbackRef.current(false);
      } catch {
        return;
      }
    }

    if (judgeMuteTimerRef.current !== null) {
      window.clearTimeout(judgeMuteTimerRef.current);
    }
    judgeMuteTimerRef.current = window.setTimeout(() => {
      judgeMuteTimerRef.current = null;
      if (!judgeMutedRef.current) return;
      judgeMutedRef.current = false;
      setJudgeMuted(false);
      setMuted(false);
      void trackRef.current?.unmute();
    }, remaining);
  }, []);

  useEffect(() => {
    if (silencedUntil && silencedUntil > Date.now()) {
      void muteForJudge(silencedUntil);
    }
  }, [silencedUntil, muteForJudge]);

  const toggleMute = useCallback(async (): Promise<void> => {
    if (judgeMutedRef.current) return;
    const track = trackRef.current;
    if (!track) {
      setError("El micrófono todavía no está listo.");
      return;
    }
    try {
      if (mutedRef.current) {
        await track.unmute();
        mutedRef.current = false;
        setMuted(false);
      } else {
        await track.mute();
        mutedRef.current = true;
        setMuted(true);
        speakingCallbackRef.current(false);
      }
    } catch (muteError: unknown) {
      setError(friendlyAudioError(muteError));
    }
  }, []);

  const enablePlayback = useCallback(async (): Promise<void> => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setCanPlaybackAudio(room.canPlaybackAudio);
    } catch {
      setError("El navegador sigue bloqueando el sonido. Pulsa de nuevo o revisa los ajustes.");
    }
  }, []);

  return {
    status,
    error,
    muted,
    judgeMuted,
    localTrack,
    speakingIds,
    canPlaybackAudio,
    toggleMute,
    enablePlayback,
    retry: () => setRetryKey((value) => value + 1),
    clearError: () => setError(null),
  };
}
