import { useEffect, useState } from "react";

type Health = { ok: boolean; livekitConfigured: boolean };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Error"));
  }, []);

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Comunidad de propietarios · 3.º B</p>
        <h1>Junta de Vecinos</h1>
        <p className="tagline">
          Un juego de voz donde cada vecino defiende su papel. Convocatoria en curso.
        </p>
      </header>

      <section className="card">
        <h2>Hito 0 · Base del proyecto</h2>
        <p>Monorepo listo: servidor Fastify, cliente React y paquete compartido.</p>
        <ul className="checklist">
          <li>
            Servidor:{" "}
            {error ? (
              <span className="bad">sin conexión ({error})</span>
            ) : health ? (
              <span className="good">conectado</span>
            ) : (
              "comprobando…"
            )}
          </li>
          <li>
            Audio LiveKit:{" "}
            {health ? (
              health.livekitConfigured ? (
                <span className="good">configurado</span>
              ) : (
                <span className="warn">sin configurar</span>
              )
            ) : (
              "—"
            )}
          </li>
        </ul>
      </section>

      <footer className="footer">
        <span>MVP hackathon · sesión 1</span>
      </footer>
    </main>
  );
}
