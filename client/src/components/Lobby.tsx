import { useState, type FormEvent } from "react";
import type { RuinaState } from "@shared/index";
import type { RuinaSelf, RuinaSocket } from "../hooks/useRuinaSocket";
import type { Session } from "../lib/session";
import { RuinaAudio } from "./ruina/RuinaAudio";
import { RuinaChat } from "./ruina/RuinaChat";

interface LobbyProps {
  room: RuinaState | null;
  you: RuinaSelf | null;
  session: Session | null;
  socket: RuinaSocket;
  initialCode: string | null;
  supabaseRealtime: { configured: boolean; connected: boolean };
}

function RealtimeBadge({ realtime }: { realtime: LobbyProps["supabaseRealtime"] }) {
  if (!realtime.configured) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        WS local
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        realtime.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      Supabase {realtime.connected ? "en vivo" : "conectando"}
    </span>
  );
}

export function Lobby({ room, you, session, socket, initialCode, supabaseRealtime }: LobbyProps) {
  const [nombre, setNombre] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [copied, setCopied] = useState(false);

  if (!room) {
    const cleanName = nombre.trim().replace(/\s+/g, " ");
    const nameOk = cleanName.length >= 2 && cleanName.length <= 20;
    const cleanCode = code.trim().toUpperCase();
    const codeOk = /^[A-Z]{4}$/.test(cleanCode);
    const busy = socket.status === "connecting" || socket.status === "reconnecting";

    function create(event: FormEvent): void {
      event.preventDefault();
      if (nameOk) socket.createRoom(cleanName);
    }

    function join(event: FormEvent): void {
      event.preventDefault();
      if (nameOk && codeOk) socket.joinRoom(cleanCode, cleanName);
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
            Comunidad de propietarios · 3.º B
          </p>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Junta de Ruina
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-balance text-slate-600">
            Una constructora ha comprado a algunos vecinos. Debatid, votad los contratos y
            descubrid quién quiere arruinar el edificio.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60 sm:p-7">
          <h2 className="text-xl font-bold text-slate-900">Entra en la junta</h2>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Tu nombre de vecino
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              maxLength={20}
              autoComplete="nickname"
              placeholder="Ej. Manoli"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </label>

          <form onSubmit={create} className="mt-4">
            <button
              type="submit"
              disabled={!nameOk || busy}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Crear una junta nueva
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            o únete con un código
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={join}>
            <label className="block text-sm font-semibold text-slate-700">
              Código de sala
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase())
                }
                maxLength={4}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABCD"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.4em] outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <button
              type="submit"
              disabled={!nameOk || !codeOk || busy}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Unirme a la sala
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Sin registro. De 5 a 8 vecinos por sala. La voz va por LiveKit y el chat siempre está
            abierto.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <strong>Resumen:</strong> 2 comerciales encubiertos de 5 a 7 vecinos, 3 con 8. El
          presidente propone una comisión, la sala vota y la comisión firma en secreto. Al mejor
          de 3, gana el bando que llegue a 2 puntos.
        </section>
      </div>
    );
  }

  if (!you || !session) return null;

  const isHost = you.isHost;
  const canStart = room.players.length >= 5 && room.players.length <= 8;
  const shareLink = `${window.location.origin}/sala/${room.code}`;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Junta de Ruina</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Sala <span className="font-mono text-amber-700">{room.code}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeBadge realtime={supabaseRealtime} />
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Lobby</span>
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Código para invitar</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="font-mono text-4xl font-black tracking-[0.3em] text-slate-900">{room.code}</span>
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              readOnly
              value={shareLink}
              className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Vecinos ({room.players.length}/8)</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            Mín. 5
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.players.map((player) => (
            <li
              key={player.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                player.connected ? "border-slate-200 bg-slate-50" : "border-red-100 bg-red-50 opacity-70"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-800">
                {player.piso.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {player.nombre}
                  {player.isHost && <span className="ml-1 text-amber-700">· anfitrión</span>}
                  {player.id === you.playerId && <span className="ml-1 text-xs text-slate-400">(tú)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  Piso {player.piso}
                  {!player.connected && " · desconectado"}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          {room.players.length < 5
            ? `Faltan ${5 - room.players.length} vecinos para poder empezar.`
            : "Ya podéis empezar. El anfitrión decide cuándo."}
        </p>
        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={socket.startGame}
            className="mt-3 w-full rounded-xl bg-amber-600 px-4 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Empezar la junta
          </button>
        ) : (
          <p className="mt-3 text-center text-sm text-slate-500">Esperando al anfitrión…</p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RuinaAudio session={session} status={socket.status} />
        <RuinaChat room={room} you={you} connected={socket.status === "connected"} onSend={socket.sendChat} />
      </div>

      <footer className="mt-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">
          {socket.status === "connected" ? "Conectado" : "Reconectando…"}
        </span>
        <button
          type="button"
          onClick={socket.leave}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
        >
          Salir
        </button>
      </footer>
    </div>
  );
}
