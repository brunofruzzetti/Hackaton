import { useState } from "react";
import type { RuinaConnectionStatus } from "../../hooks/useRuinaSocket";
import { useLiveKit } from "../../hooks/useLiveKit";
import type { Session } from "../../lib/session";
import { BRUTAL } from "../../lib/ui";

interface RuinaAudioProps {
  session: Session;
  status: RuinaConnectionStatus;
}

const LABEL: Record<string, string> = {
  idle: "MIC APAGADO",
  connecting: "CONECTANDO…",
  connected: "VOZ EN VIVO",
  error: "ERROR DE VOZ",
  disabled: "VOZ NO CONFIGURADA",
};

export function RuinaAudio({ session, status }: RuinaAudioProps) {
  // El micro solo se pide tras un gesto explícito del usuario. Esto evita
  // bloqueos de autoplay/permisos en móvil y deja claro que hay voz activa.
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const audio = useLiveKit({
    session,
    enabled: status === "connected" && voiceEnabled,
    onSpeakingChange: () => undefined,
    silencedUntil: null,
  });

  const micReady = audio.status === "connected" && audio.localTrack !== null;

  function joinVoice(): void {
    setVoiceEnabled(true);
  }

  function leaveVoice(): void {
    setVoiceEnabled(false);
  }

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
        {!voiceEnabled ? (
          <div className="space-y-2">
            <p className="border-2 border-dashed border-black bg-[#fef08a] px-2 py-1.5 font-mono text-[10px] leading-relaxed">
              Micro y voz en vivo por LiveKit. Pulsa el botón: el navegador te pedirá permiso de
              micrófono.
            </p>
            <button
              type="button"
              onClick={joinVoice}
              disabled={status !== "connected"}
              className={`${BRUTAL.button} w-full bg-[#22c55e] px-3 py-3 font-black uppercase text-white`}
            >
              🎙 ENTRAR EN LA VOZ
            </button>
            <p className="text-center font-mono text-[9px] uppercase text-stone-500">
              Si prefieres no hablar, el chat de texto sigue abierto.
            </p>
          </div>
        ) : (
          <>
            {status !== "connected" && (
              <p className="border-2 border-dashed border-black bg-white px-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase">
                Reconectando la sala…
              </p>
            )}
            {status === "connected" && audio.status === "idle" && (
              <p className="border-2 border-dashed border-black bg-white px-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase">
                Preparando micrófono…
              </p>
            )}
            {audio.status === "connecting" && (
              <p className="border-2 border-dashed border-black bg-white px-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase">
                Conectando micro…
              </p>
            )}
            {audio.status === "disabled" && (
              <p className="border-2 border-dashed border-black bg-[#fef08a] px-2 py-1.5 font-mono text-[10px] leading-relaxed">
                El servidor no tiene LiveKit configurado. Usa el chat de texto.
              </p>
            )}
            {audio.error && (
              <p className="border-2 border-black bg-red-100 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-red-900">
                {audio.error}
              </p>
            )}
            {audio.status === "connected" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 border-2 border-black bg-[#f4efe6] px-2 py-1.5">
                  <span className="font-mono text-[10px] font-black uppercase">
                    {!micReady ? "🎙 MIC NO DISPONIBLE" : audio.muted ? "🔇 MIC CERRADO" : "🎙 MIC ABIERTO"}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase text-stone-500">
                    {audio.speakingIds.length > 0
                      ? `${audio.speakingIds.length} HABLANDO`
                      : "SIN VOZ AHORA"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void audio.toggleMute()}
                    disabled={!micReady}
                    className={`${BRUTAL.buttonSm} min-h-[44px] px-2 py-2 font-mono text-[10px] font-black uppercase text-white ${
                      audio.muted ? "bg-[#ef4444]" : "bg-black"
                    }`}
                  >
                    {audio.muted ? "ABRIR MIC" : "CERRAR MIC"}
                  </button>
                  <button
                    type="button"
                    onClick={leaveVoice}
                    className={`${BRUTAL.buttonSm} min-h-[44px] bg-white px-2 py-2 font-mono text-[10px] font-black uppercase`}
                  >
                    SALIR DE VOZ
                  </button>
                </div>
                {!micReady && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceEnabled(false);
                      window.setTimeout(() => setVoiceEnabled(true), 50);
                    }}
                    className={`${BRUTAL.buttonSm} w-full bg-[#fef08a] px-2 py-2 font-mono text-[10px] font-black uppercase`}
                  >
                    REINTENTAR PERMISO DE MICRÓFONO
                  </button>
                )}
              </div>
            )}
            {audio.status === "error" && (
              <button
                type="button"
                onClick={audio.retry}
                className={`${BRUTAL.buttonSm} mt-2 w-full bg-[#fef08a] px-2 py-2 font-mono text-[10px] font-black uppercase`}
              >
                REINTENTAR VOZ
              </button>
            )}
          </>
        )}
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-stone-500">
          La voz es LiveKit; el chat de abajo es el acta de respaldo.
        </p>
      </div>
    </section>
  );
}
