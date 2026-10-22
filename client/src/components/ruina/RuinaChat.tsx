import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RuinaState } from "@shared/index";
import type { RuinaSelf } from "../../hooks/useRuinaSocket";

interface RuinaChatProps {
  room: RuinaState;
  you: RuinaSelf;
  connected: boolean;
  onSend: (text: string) => void;
}

export function RuinaChat({ room, you, connected, onSend }: RuinaChatProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [room.chat.length]);

  function submit(event: FormEvent): void {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Chat de la junta</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {room.chat.length}
        </span>
      </div>
      <div
        ref={listRef}
        aria-live="polite"
        className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5"
      >
        {room.chat.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aquí aparecerán las acusaciones, las excusas y los pactos.
          </p>
        ) : (
          room.chat.map((message) => (
            <article
              key={message.id}
              className={`rounded-lg px-2 py-1.5 text-sm ${
                message.playerId === you.playerId ? "bg-amber-100/80" : "bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-xs text-slate-700">{message.nombre}</strong>
                <time
                  className="text-[10px] text-slate-400"
                  dateTime={new Date(message.at).toISOString()}
                >
                  {new Date(message.at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="mt-0.5 break-words text-slate-800">{message.texto}</p>
            </article>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={280}
          placeholder={connected ? "Escribe una acusación…" : "Sin conexión…"}
          disabled={!connected}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!connected || !text.trim()}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
