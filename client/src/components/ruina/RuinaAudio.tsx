import type { RuinaConnectionStatus } from "../../hooks/useRuinaSocket";
import { useLiveKit } from "../../hooks/useLiveKit";
import type { Session } from "../../lib/session";

interface RuinaAudioProps {
  session: Session;
  status: RuinaConnectionStatus;
}

const LABEL: Record<string, string> = {
  idle: "Sin audio",
  connecting: "Conectando audio…",
  connected: "Audio conectado",
  error: "Error de audio",
  disabled: "Audio no configurado",
};

export function RuinaAudio({ session, status }: RuinaAudioProps) {
  const audio = useLiveKit({
    session,
    enabled: status === "connected",
    onSpeakingChange: () => undefined,
    silencedUntil: null,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Voz de la junta</h2>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            audio.status === "connected"
              ? "bg-emerald-100 text-emerald-700"
              : audio.status === "error"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {LABEL[audio.status] ?? audio.status}
        </span>
      </div>

      {audio.status === "disabled" && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          El servidor no tiene LiveKit configurado. Podéis seguir con el chat.
        </p>
      )}
      {audio.status === "error" && (
        <div className="mt-2 space-y-2">
          <p className="rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">{audio.error}</p>
          <button
            type="button"
            onClick={audio.retry}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Reintentar audio
          </button>
        </div>
      )}
      {audio.status === "connected" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void audio.toggleMute()}
            disabled={!audio.localTrack}
            className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-40 ${
              audio.muted ? "bg-red-600 hover:bg-red-700" : "bg-slate-700 hover:bg-slate-800"
            }`}
          >
            {audio.muted ? "Activar micrófono" : "Silenciar micrófono"}
          </button>
          {!audio.canPlaybackAudio && (
            <button
              type="button"
              onClick={() => void audio.enablePlayback()}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Activar sonido
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        La voz va por LiveKit; el chat de abajo es el plan B y también sirve para acusar.
      </p>
    </section>
  );
}
