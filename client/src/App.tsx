import { Lobby } from "./components/Lobby";
import { PlayerDashboard } from "./components/PlayerDashboard";
import { ResolutionModal } from "./components/ResolutionModal";
import { VotingPanel } from "./components/VotingPanel";
import { RuinaAudio } from "./components/ruina/RuinaAudio";
import { RuinaChat } from "./components/ruina/RuinaChat";
import { useGameSounds } from "./hooks/useGameSounds";
import { useRuinaSocket } from "./hooks/useRuinaSocket";
import { useSupabaseRoom } from "./hooks/useSupabaseRoom";
import { codeFromUrl } from "./lib/session";
import { BRUTAL } from "./lib/ui";

export function App() {
  const game = useRuinaSocket();
  const realtime = useSupabaseRoom(game.room?.code ?? null);
  const sounds = useGameSounds(game.room);
  const initialCode = codeFromUrl();
  const realtimeBadge = { configured: realtime.configured, connected: realtime.connected };
  const busy = game.status === "connecting" || game.status === "reconnecting";

  if (!game.room) {
    if (busy) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] p-6">
          <div className="border-[3px] border-black bg-[#fffdf7] px-6 py-8 text-center shadow-[8px_8px_0_0_#000]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-black border-t-[#fef08a]" />
            <h1 className="mt-4 text-xl font-black uppercase tracking-tight">
              {game.status === "reconnecting" ? "Volviendo a la junta…" : "Conectando…"}
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase text-stone-500">
              Preparando el acta de la comunidad
            </p>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-[#f4efe6]">
        <Lobby
          room={null}
          you={null}
          session={null}
          socket={game}
          initialCode={initialCode}
          supabaseRealtime={realtimeBadge}
        />
        <ErrorToast error={game.error} onClose={game.clearError} />
      </main>
    );
  }

  if (!game.you || !game.session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] p-6">
        <div className="border-[3px] border-black bg-[#fffdf7] px-6 py-8 text-center shadow-[8px_8px_0_0_#000]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-black border-t-[#fef08a]" />
          <h1 className="mt-4 text-xl font-black uppercase tracking-tight">
            Recuperando tu asiento…
          </h1>
        </div>
      </main>
    );
  }

  if (game.room.phase === "LOBBY") {
    return (
      <main className="min-h-screen bg-[#f4efe6]">
        <Lobby
          room={game.room}
          you={game.you}
          session={game.session}
          socket={game}
          initialCode={initialCode}
          supabaseRealtime={realtimeBadge}
        />
        <ErrorToast error={game.error} onClose={game.clearError} />
      </main>
    );
  }

  if (!game.privateInfo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] p-6">
        <div className="border-[3px] border-black bg-[#fffdf7] px-6 py-8 text-center shadow-[8px_8px_0_0_#000]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-black border-t-[#fef08a]" />
          <h1 className="mt-4 text-xl font-black uppercase tracking-tight">
            Repartiendo expedientes…
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase text-stone-500">
            Abriendo los sobres secretos
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] text-stone-950">
      <div className="mx-auto max-w-6xl px-3 pb-10 pt-3 sm:px-4">
        <PlayerDashboard
          room={game.room}
          you={game.you}
          privateInfo={game.privateInfo}
          supabaseRealtime={realtimeBadge}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <RuinaAudio session={game.session} status={game.status} />
            <RuinaChat
              room={game.room}
              you={game.you}
              connected={game.status === "connected"}
              onSend={game.sendChat}
            />
          </aside>

          <div className="lg:order-last">
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  MENÚ PRINCIPAL
                </p>
                <p className="text-sm font-black uppercase leading-none tracking-tight">
                  Acciones de la junta
                </p>
              </div>
              <span className="border-2 border-black bg-[#fef08a] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
                {game.room.phase.replaceAll("_", " ")}
              </span>
            </div>
            <VotingPanel
              room={game.room}
              you={game.you}
              privateInfo={game.privateInfo}
              socket={game}
            />
          </div>
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase text-stone-500">
            {game.status === "connected" ? "● CONECTADO" : "○ RECONECTANDO"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={sounds.toggleSound}
              className={`${BRUTAL.buttonSm} bg-white px-2.5 py-1.5 font-mono text-[10px] font-black uppercase`}
              title="Activar o silenciar los efectos"
            >
              {sounds.soundEnabled ? "🔊 SONIDO" : "🔇 SILENCIO"}
            </button>
            {game.you.isHost && game.room.phase !== "VICTORIA" && (
              <button
                type="button"
                onClick={game.forceAdvance}
                title="Emergencia: resuelve la fase actual y avanza"
                className={`${BRUTAL.buttonSm} bg-[#fef08a] px-2.5 py-1.5 font-mono text-[10px] font-black uppercase`}
              >
                ⚠ FORZAR FASE
              </button>
            )}
            <button
              type="button"
              onClick={game.leave}
              className={`${BRUTAL.buttonSm} bg-white px-2.5 py-1.5 font-mono text-[10px] font-black uppercase`}
            >
              SALIR
            </button>
          </div>
        </footer>
      </div>

      <ResolutionModal room={game.room} onLeave={game.leave} />
      <ErrorToast error={game.error} onClose={game.clearError} />
    </main>
  );
}

function ErrorToast({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-3 left-1/2 z-[60] flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-start gap-2 border-[3px] border-black bg-[#ef4444] p-2.5 text-white shadow-[6px_6px_0_0_#000]"
    >
      <p className="flex-1 font-mono text-xs font-bold leading-relaxed">{error}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="border-2 border-black bg-white px-2 font-mono text-sm font-black text-black transition-all active:translate-x-[1px] active:translate-y-[1px]"
      >
        ×
      </button>
    </div>
  );
}
