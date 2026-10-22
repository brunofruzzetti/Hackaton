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
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <h1 className="mt-4 text-xl font-black text-slate-900">
              {game.status === "reconnecting" ? "Volviendo a la junta…" : "Conectando…"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Preparando la sala y el acta de la comunidad.</p>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-slate-100">
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">Recuperando tu asiento…</h1>
        </div>
      </main>
    );
  }

  if (game.room.phase === "LOBBY") {
    return (
      <main className="min-h-screen bg-slate-100">
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">Repartiendo expedientes…</h1>
          <p className="mt-1 text-sm text-slate-500">Preparando los sobres secretos de la junta.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4">
        <PlayerDashboard
          room={game.room}
          you={game.you}
          privateInfo={game.privateInfo}
          supabaseRealtime={realtimeBadge}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <VotingPanel
            room={game.room}
            you={game.you}
            privateInfo={game.privateInfo}
            socket={game}
          />
          <aside className="space-y-4">
            <RuinaAudio session={game.session} status={game.status} />
            <RuinaChat
              room={game.room}
              you={game.you}
              connected={game.status === "connected"}
              onSend={game.sendChat}
            />
          </aside>
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {game.status === "connected" ? "Conectado" : "Reconectando…"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sounds.toggleSound}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200"
              title="Activar o silenciar los efectos"
            >
              {sounds.soundEnabled ? "🔊 Sonido" : "🔇 Silencio"}
            </button>
            {game.you.isHost && game.room.phase !== "VICTORIA" && (
              <button
                type="button"
                onClick={game.forceAdvance}
                title="Emergencia: resuelve la fase actual y avanza"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                Forzar siguiente fase
              </button>
            )}
            <button
              type="button"
              onClick={game.leave}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200"
            >
              Salir
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
      className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border border-red-200 bg-white p-3 text-sm shadow-xl"
    >
      <p className="flex-1 text-slate-700">{error}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="rounded-lg px-2 text-lg font-bold text-slate-400 hover:bg-slate-100"
      >
        ×
      </button>
    </div>
  );
}
