import { useState, type FormEvent } from "react";

interface HomeProps {
  initialCode: string | null;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
}

export function Home({ initialCode, onCreate, onJoin }: HomeProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");

  const cleanName = name.trim().replace(/\s+/g, " ");
  const nameOk = cleanName.length >= 2 && cleanName.length <= 20;
  const cleanCode = code.trim().toUpperCase();
  const codeOk = /^[A-Z]{4}$/.test(cleanCode);

  function handleCreate(event: FormEvent): void {
    event.preventDefault();
    if (nameOk) onCreate(cleanName);
  }

  function handleJoin(event: FormEvent): void {
    event.preventDefault();
    if (nameOk && codeOk) onJoin(cleanCode, cleanName);
  }

  return (
    <div className="home">
      <header className="hero">
        <p className="eyebrow">Comunidad de propietarios · 3.º B</p>
        <h1>Junta de Vecinos</h1>
        <p className="tagline">
          Habla, cotillea y defiende tu rol. Un juez IA decidirá si has estado a la altura.
        </p>
      </header>

      <section className="card">
        <h2>Entra en la junta</h2>

        <label className="field" htmlFor="player-name">
          <span>Tu nombre de vecino</span>
          <input
            id="player-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            autoComplete="nickname"
            placeholder="Ej. Manoli"
          />
        </label>

        <form onSubmit={handleCreate}>
          <button className="btn btn-primary" type="submit" disabled={!nameOk}>
            Crear una junta nueva
          </button>
        </form>

        <div className="divider">
          <span>o únete con un código</span>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <label className="field" htmlFor="room-code">
            <span>Código de sala</span>
            <input
              id="room-code"
              className="code-input"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase())
              }
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={4}
              placeholder="ABCD"
            />
          </label>
          <button className="btn btn-secondary" type="submit" disabled={!nameOk || !codeOk}>
            Unirme a la sala
          </button>
        </form>

        <p className="hint">
          Sin registro: solo tu nombre. Comparte el código con tus vecinos para que entren.
        </p>
      </section>

      <section className="card mini">
        <h3>Cómo funciona</h3>
        <ol className="steps">
          <li>Se crea una sala y se reparten roles cliché sin repetir.</li>
          <li>Los vecinos IA y los humanos discuten una propuesta de la comunidad.</li>
          <li>El juez puntúa tus tareas y lo bien que interpretas tu papel: ganas puntos.</li>
          <li>Tras 3 rondas gana quien tenga más puntos.</li>
        </ol>
      </section>
    </div>
  );
}
