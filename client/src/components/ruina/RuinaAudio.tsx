import type { RuinaConnectionStatus } from "../../hooks/useRuinaSocket";
import { useLiveKit } from "../../hooks/useLiveKit";
import type { Session } from "../../lib/session";
import { BRUTAL } from "../../lib/ui";

interface RuinaAudioProps {
  session: Session;
  status: RuinaConnectionStatus;
}

const LABEL: Record<string, string> = {
  idle: "SIN AUDIO",
  connecting: "CONECTANDO…",
  connected: "AUDIO OK",
  error: "ERROR DE AUDIO",
  disabled: "AUDIO NO CONFIGURADO",
};

export function RuinaAudio({ session, status }: RuinaAudioProps) {
  const audio = useLiveKit({
    session,
    enabled: status === "connected",
    onSpeakingChange: () => undefined,
    silencedUntil: null,
  });

  return (
    <section className={`${BRUTAL.card} overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-[#38bdf8] px-2.5 py-1.5">
        <h2 className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          🎙 VOZ DE LA JUNTA
        </h2>
        <span
          className={`border border-black px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
            audio.status === "connected"
              ? "bg-[#22c55e] text-white"
              : audio.status === "error"
                ? "bg-[#ef4444] text-white"
                : "bg-white"
          }`}
        >
          {LABEL[audio.status] ?? audio.status}
        </span>
      </div>

      <div className="p-2.5">
        {audio.status === "disabled" && (
          <p className="border-2 border-dashed border-black bg-[#fef08a] px-2 py-1.5 font-mono text-[10px] leading-relaxed">
            LiveKit no está configurado. El chat sigue funcionando.
          </p>
        )}
        {audio.status === "error" && (
          <div className="space-y-2">
            <p className="border-2 border-black bg-red-100 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-red-900">
              {audio.error}
            </p>
            <button
              type="button"
              onClick={audio.retry}
              className={`${BRUTAL.buttonSm} bg-white px-2 py-1.5 font-mono text-[10px] font-black uppercase`}
            >
              REINTENTAR AUDIO
            </button>
          </div>
        )}
        {audio.status === "connected" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void audio.toggleMute()}
              disabled={!audio.localTrack}
              className={`${BRUTAL.buttonSm} px-2.5 py-2 font-mono text-[10px] font-black uppercase text-white ${
                audio.muted ? "bg-[#ef4444]" : "bg-black"
              }`}
            >
              {audio.muted ? "ACTIVAR MICRÓFONO" : "SILENCIAR MICRÓFONO"}
            </button>
            {!audio.canPlaybackAudio && (
              <button
                type="button"
                onClick={() => void audio.enablePlayback()}
                className={`${BRUTAL.buttonSm} bg-[#fef08a] px-2.5 py-2 font-mono text-[10px] font-black uppercase`}
              >
                ACTIVAR SONIDO
              </button>
            )}
          </div>
        )}
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-stone-500">
          Voz por LiveKit. El chat de abajo es el acta de respaldo.
        </p>
      </div>
    </section>
  );
}
