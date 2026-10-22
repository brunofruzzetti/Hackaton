import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { useGameSocket } from "./hooks/useGameSocket";
import { codeFromUrl } from "./lib/session";

export function App() {
  const game = useGameSocket();
  const initialCode = codeFromUrl();
  const busy = game.status === "connecting" || game.status === "reconnecting";

  return (
    <main className="app-shell">
      {game.room && game.you ? (
        <Lobby
          room={game.room}
          you={game.you}
          status={game.status}
          onAddAi={game.addAi}
          onRemoveAi={game.removeAi}
          onStart={game.startGame}
          onLeave={game.leave}
        />
      ) : busy ? (
        <section className="connecting-screen">
          <div className="spinner" aria-hidden="true" />
          <h1>{game.status === "reconnecting" ? "Volviendo a la junta…" : "Conectando…"}</h1>
          <p className="hint">Preparando la sala y el acta de la comunidad.</p>
        </section>
      ) : (
        <Home
          initialCode={initialCode}
          onCreate={game.createRoom}
          onJoin={game.joinRoom}
        />
      )}

      {game.error && (
        <div className="toast" role="alert">
          <p>{game.error}</p>
          <button type="button" className="btn-icon" onClick={game.clearError} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
    </main>
  );
}
