import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RuinaState } from "@shared/index";
import type { RuinaSelf } from "../../hooks/useRuinaSocket";
import { BRUTAL } from "../../lib/ui";

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
    <section className={`${BRUTAL.card} overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-[#fef08a] px-2.5 py-1.5">
        <h2 className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          🗒 ACTA / CHAT DE LA JUNTA
        </h2>
        <span className="border border-black bg-white px-1.5 py-0.5 font-mono text-[9px] font-black">
          {room.chat.length}
        </span>
      </div>
      <div className="p-2.5">
        <div
          ref={listRef}
          aria-live="polite"
          className="flex max-h-80 flex-col gap-1.5 overflow-y-auto border-2 border-black bg-[#f4efe6] p-1.5"
        >
          {room.chat.length === 0 ? (
            <p className="px-1 py-2 font-mono text-[10px] leading-relaxed text-stone-500">
              Aquí aparecerán las acusaciones, las excusas y los pactos bajo cuerda.
            </p>
          ) : (
            room.chat.map((message) => (
              <article
                key={message.id}
                className={`border-2 border-black px-1.5 py-1 ${
                  message.playerId === you.playerId ? "bg-[#fef08a]" : "bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="font-mono text-[9px] font-black uppercase">
                    {message.nombre}
                  </strong>
                  <time
                    className="font-mono text-[8px] text-stone-400"
                    dateTime={new Date(message.at).toISOString()}
                  >
                    {new Date(message.at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="mt-0.5 break-words font-mono text-[11px] leading-snug">
                  {message.texto}
                </p>
              </article>
            ))
          )}
        </div>
        <form onSubmit={submit} className="mt-2 flex gap-1.5">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={280}
            placeholder={connected ? "Escribe una acusación…" : "Sin conexión…"}
            disabled={!connected}
            autoComplete="off"
            className="min-w-0 flex-1 border-2 border-black bg-white px-2 py-2 font-mono text-xs outline-none transition-shadow focus:shadow-[2px_2px_0_0_#000] disabled:bg-stone-100"
          />
          <button
            type="submit"
            disabled={!connected || !text.trim()}
            className={`${BRUTAL.buttonSm} bg-black px-2.5 py-2 font-mono text-[10px] font-black uppercase text-white`}
          >
            ENVIAR
          </button>
        </form>
      </div>
    </section>
  );
}
