import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getEffectiveRole,
  type PresidentStyleId,
  type TranscriptEntry,
} from "@shared/index";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  youId: string;
  presidentStyleId: PresidentStyleId | null;
  chatDisabled: boolean;
  onSendChat: (text: string) => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TranscriptPanel({
  entries,
  youId,
  presidentStyleId,
  chatDisabled,
  onSendChat,
}: TranscriptPanelProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length]);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || chatDisabled) return;
    onSendChat(trimmed);
    setText("");
  }

  return (
    <section className="card transcript-card">
      <div className="card-head">
        <h2>Transcripción compartida</h2>
        <span className="badge">{entries.length}</span>
      </div>

      <div className="transcript" ref={listRef} aria-live="polite">
        {entries.length === 0 ? (
          <p className="hint">
            Aún no hay intervenciones. Mantén pulsado el micrófono o escribe un mensaje: todo entra
            en el acta.
          </p>
        ) : (
          entries.map((entry) => {
            const roleName = entry.roleId
              ? getEffectiveRole(entry.roleId, presidentStyleId).name
              : "Vecino";
            return (
              <article
                key={entry.id}
                className={`transcript-entry ${entry.playerId === youId ? "own" : ""}`}
              >
                <div className="transcript-meta">
                  <span aria-hidden="true">
                    {entry.source === "voice" ? "🎙️" : entry.source === "ai" ? "🤖" : "💬"}
                  </span>
                  <span className="transcript-label">
                    [{entry.playerName} | {roleName}]
                  </span>
                  <time dateTime={new Date(entry.at).toISOString()}>{formatTime(entry.at)}</time>
                </div>
                <p>{entry.text}</p>
              </article>
            );
          })
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-message">
          Mensaje de chat
        </label>
        <input
          id="chat-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={280}
          placeholder={chatDisabled ? "Sin conexión…" : "Escribe si el micro falla…"}
          disabled={chatDisabled}
          autoComplete="off"
        />
        <button
          className="btn btn-secondary btn-small"
          type="submit"
          disabled={chatDisabled || !text.trim()}
        >
          Enviar
        </button>
      </form>
      <p className="hint">El chat es el plan B: también se transcribe y lo ve toda la sala.</p>
    </section>
  );
}
