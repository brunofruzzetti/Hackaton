import type { LiveKitAudio } from "../hooks/useLiveKit";
import type { Session } from "../lib/session";
import { PushToTalk } from "./PushToTalk";

interface AudioPanelProps {
  audio: LiveKitAudio;
  session: Session;
  speakingNames: string[];
  onError: (message: string) => void;
}

const STATUS_LABEL: Record<LiveKitAudio["status"], string> = {
  idle: "Sin audio",
  connecting: "Conectando audio…",
  connected: "Audio conectado",
  error: "Error de audio",
  disabled: "Audio no configurado",
};

export function AudioPanel({ audio, session, speakingNames, onError }: AudioPanelProps) {
  const connected = audio.status === "connected";
  const pttDisabledReason = audio.judgeMuted
    ? "El juez te ha silenciado durante 3 segundos."
    : !connected
      ? "El audio de la sala no está conectado."
      : audio.muted
        ? "Tienes el micrófono silenciado."
        : !audio.localTrack
          ? "Conecta un micrófono para usar el push-to-talk."
          : "";

  return (
    <section className="card audio-card">
      <div className="card-head">
        <h2>Audio de la sala</h2>
        <span className="audio-status" data-state={audio.status}>
          {STATUS_LABEL[audio.status]}
        </span>
      </div>

      {audio.status === "disabled" && (
        <p className="hint warn">
          El servidor no tiene LiveKit configurado. Puedes seguir usando el chat y la transcripción
          de texto. Configura <code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code> y{" "}
          <code>LIVEKIT_API_SECRET</code> para activar la voz.
        </p>
      )}

      {audio.status === "error" && (
        <div className="audio-error">
          <p className="hint warn">{audio.error}</p>
          <button className="btn btn-secondary btn-small" type="button" onClick={audio.retry}>
            Reintentar audio
          </button>
        </div>
      )}

      {audio.status === "connecting" && (
        <p className="hint">Conectando al canal de voz y publicando tu micrófono…</p>
      )}

      {connected && (
        <>
          <div className="speaking-summary">
            <span className={`live-dot ${speakingNames.length > 0 ? "active" : ""}`} />
            {speakingNames.length > 0
              ? `Hablando: ${speakingNames.join(", ")}`
              : "Nadie está hablando ahora mismo."}
          </div>

          {audio.judgeMuted && (
            <p className="hint warn">
              📢 El juez te ha silenciado durante 3 segundos. Espera la cuenta atrás.
            </p>
          )}

          <div className="audio-actions">
            <button
              className={`btn ${audio.muted ? "btn-danger" : "btn-secondary"}`}
              type="button"
              onClick={() => void audio.toggleMute()}
              disabled={!audio.localTrack || audio.judgeMuted}
            >
              {audio.judgeMuted
                ? "Silenciado por el juez"
                : audio.muted
                  ? "Activar micrófono"
                  : "Silenciar micrófono"}
            </button>
            {!audio.canPlaybackAudio && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void audio.enablePlayback()}
              >
                Activar sonido
              </button>
            )}
          </div>

          {audio.error && <p className="hint warn">{audio.error}</p>}

          <PushToTalk
            session={session}
            localTrack={audio.localTrack}
            disabled={!connected || audio.muted || !audio.localTrack}
            disabledReason={pttDisabledReason}
            onError={onError}
          />
        </>
      )}

      {audio.status !== "connected" && audio.status !== "disabled" && (
        <p className="hint">
          Si el micrófono falla, el chat de abajo sigue funcionando y entra en la transcripción.
        </p>
      )}
    </section>
  );
}
