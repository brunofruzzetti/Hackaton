import { useEffect, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RUINA_MAX_AI, type RuinaState } from "@shared/index";
import type { RuinaSelf, RuinaSocket } from "../hooks/useRuinaSocket";
import { fetchPublicConfig, type PublicConfig } from "../lib/api";
import type { Session } from "../lib/session";
import { BRUTAL } from "../lib/ui";
import { PortalScene } from "./PortalScene";
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

function buildBaseLink(config: PublicConfig | null): string {
  const publicBase = config?.publicUrl?.replace(/\/+$/, "");
  if (publicBase) return publicBase;

  const { protocol, hostname, port } = window.location;
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  const lan = config?.lanAddresses?.[0];
  const host = localHost && lan ? lan : hostname;
  const portPart = port ? `:${port}` : "";
  return `${protocol}//${host}${portPart}`;
}

function buildShareLink(code: string, config: PublicConfig | null): string {
  return `${buildBaseLink(config)}/sala/${code}`;
}

function RealtimeBadge({ realtime }: { realtime: LobbyProps["supabaseRealtime"] }) {
  if (!realtime.configured) {
    return (
      <span className="border-2 border-black bg-white px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
        WS local
      </span>
    );
  }
  return (
    <span
      className={`border-2 border-black px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000] ${
        realtime.connected ? "bg-[#22c55e] text-white" : "bg-[#fef08a]"
      }`}
    >
      Supabase {realtime.connected ? "● LIVE" : "○ CONECTANDO"}
    </span>
  );
}

export function Lobby({ room, you, session, socket, initialCode, supabaseRealtime }: LobbyProps) {
  const [nombre, setNombre] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [copied, setCopied] = useState(false);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublicConfig()
      .then((config) => {
        if (active) setPublicConfig(config);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!room) {
    const cleanName = nombre.trim().replace(/\s+/g, " ");
    const nameOk = cleanName.length >= 2 && cleanName.length <= 20;
    const cleanCode = code.trim().toUpperCase();
    const codeOk = /^[A-Z]{4}$/.test(cleanCode);
    const busy = socket.status === "connecting" || socket.status === "reconnecting";
    const entryLink = buildBaseLink(publicConfig);

    function create(event: FormEvent): void {
      event.preventDefault();
      if (nameOk) socket.createRoom(cleanName);
    }

    function join(event: FormEvent): void {
      event.preventDefault();
      if (nameOk && codeOk) socket.joinRoom(cleanCode, cleanName);
    }

    return (
      <div className="min-h-screen bg-[#f4efe6] px-3 py-4 sm:px-5 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center justify-between border-2 border-black bg-[#fef08a] px-3 py-1.5 shadow-[3px_3px_0_0_#000]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
              TABLÓN DE ANUNCIOS · COMUNIDAD 3.º B
            </p>
            <span className="hidden rotate-2 border border-black bg-white px-1.5 py-0.5 font-mono text-[8px] font-black sm:block">
              VECINOS EN GUERRA
            </span>
          </div>

          <header className="relative mb-5 border-[3px] border-black bg-[#fffdf7] p-4 shadow-[7px_7px_0_0_#000] sm:p-6">
            <span className="tape -top-3 left-8" aria-hidden="true" />
            <span className="tape -top-3 right-10 rotate-[7deg]" aria-hidden="true" />
            <p className={`${BRUTAL.label} text-stone-500`}>
              JUNTA EXTRAORDINARIA DE PROPIETARIOS
            </p>
            <h1 className="mt-1 text-5xl font-black uppercase leading-[0.86] tracking-tighter sm:text-7xl">
              Sabotea la
              <br />
              <span className="text-[#b91c1c]">junta</span>
            </h1>
            <p className="mt-3 max-w-2xl font-mono text-sm leading-relaxed text-stone-700 sm:text-base">
              Una constructora ha comprado a algunos vecinos. Debatid, votad los contratos y
              descubrid quién quiere arruinar el edificio antes de que se caiga la fachada.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="border-2 border-black bg-[#22c55e] px-2 py-1 font-mono text-[9px] font-black uppercase text-white shadow-[2px_2px_0_0_#000]">
                5–8 vecinos
              </span>
              <span className="border-2 border-black bg-white px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
                Bo3
              </span>
              <span className="border-2 border-black bg-[#38bdf8] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
                Voz LiveKit + chat
              </span>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className={`${BRUTAL.cardLg} p-4 sm:p-5`}>
              <div className="flex items-end justify-between gap-2 border-b-2 border-black pb-2">
                <h2 className="text-2xl font-black uppercase tracking-tight">Entra en la junta</h2>
                <span className="font-mono text-[9px] font-bold uppercase text-stone-500">
                  SIN REGISTRO
                </span>
              </div>

              <label className="mt-3 block font-mono text-[10px] font-bold uppercase tracking-wider">
                Tu nombre de vecino
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  maxLength={20}
                  autoComplete="nickname"
                  placeholder="Ej. Manoli"
                  className="mt-1 w-full border-2 border-black bg-white px-3 py-3 font-mono text-base font-bold outline-none transition-shadow focus:shadow-[3px_3px_0_0_#000]"
                />
              </label>

              <form onSubmit={create} className="mt-3">
                <button
                  type="submit"
                  disabled={!nameOk || busy}
                  className={`${BRUTAL.button} w-full bg-[#fef08a] px-4 py-3 text-sm font-black uppercase tracking-wide`}
                >
                  📌 Crear una junta nueva
                </button>
              </form>

              <div className="my-4 flex items-center gap-2 font-mono text-[9px] font-bold uppercase text-stone-400">
                <span className="h-0.5 flex-1 bg-black" />
                o únete con un código
                <span className="h-0.5 flex-1 bg-black" />
              </div>

              <form onSubmit={join}>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider">
                  Código de sala
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase(),
                      )
                    }
                    maxLength={4}
                    autoCapitalize="characters"
                    autoComplete="off"
                    placeholder="ABCD"
                    className="mt-1 w-full border-2 border-black bg-white px-3 py-2.5 text-center font-mono text-2xl font-black tracking-[0.35em] outline-none transition-shadow focus:shadow-[3px_3px_0_0_#000]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!nameOk || !codeOk || busy}
                  className={`${BRUTAL.button} mt-3 w-full bg-[#38bdf8] px-4 py-3 text-sm font-black uppercase tracking-wide`}
                >
                  🚪 Unirme a la sala
                </button>
              </form>

              <p className="mt-3 font-mono text-[10px] leading-relaxed text-stone-500">
                Mínimo 5, máximo 8. La voz va por LiveKit; el chat siempre está disponible. El
                anfitrión puede añadir hasta 4 IAs para probar la partida.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="relative rotate-[0.6deg] border-2 border-black bg-[#fef08a] p-4 shadow-[5px_5px_0_0_#000]">
                <span className="postit-pin" aria-hidden="true" />
                <h2 className="text-xl font-black uppercase leading-none tracking-tight">
                  Cartel de normas
                </h2>
                <ol className="mt-3 space-y-2 font-mono text-xs leading-snug">
                  <li>
                    <strong>01.</strong> 2 comerciales infiltrados (3 si sois 8).
                  </li>
                  <li>
                    <strong>02.</strong> Cada vecino recibe un chisme sobre el de su derecha.
                  </li>
                  <li>
                    <strong>03.</strong> El presidente propone comisión; la sala vota en público.
                  </li>
                  <li>
                    <strong>04.</strong> La comisión firma a solas. Un sabotaje huele a punto rojo.
                  </li>
                  <li>
                    <strong>05.</strong> Dos rechazos y la constructora derrumba el edificio.
                  </li>
                </ol>
              </section>

              <section className="border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                <p className={`${BRUTAL.label} text-stone-500`}>AVISO DEL ADMINISTRADOR</p>
                <p className="mt-1 font-mono text-xs leading-relaxed">
                  “No enseñéis la credencial. Aquí el que dice que todo está limpio suele tener
                  una cláusula trampa en el bolsillo.”
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <RealtimeBadge realtime={supabaseRealtime} />
                  <span className="text-2xl" aria-hidden="true">
                    🕵️
                  </span>
                </div>
              </section>

              <section className="border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 border-2 border-black bg-[#fffdf7] p-1">
                    <QRCodeSVG
                      value={entryLink}
                      size={92}
                      bgColor="#fffdf7"
                      fgColor="#111827"
                      level="M"
                      title="Abrir Sabotea la junta en el móvil"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black uppercase tracking-wider">
                      📱 Acceso desde el móvil
                    </p>
                    <p className="mt-1 font-mono text-[9px] leading-relaxed text-stone-500">
                      Escanea para abrir el menú principal y desde ahí crear o unirte a una sala.
                    </p>
                    <a
                      href={entryLink}
                      className="mt-1 inline-block border-2 border-black bg-[#38bdf8] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      Abrir menú
                    </a>
                  </div>
                </div>
                {entryLink.includes("localhost") && (
                  <p className="mt-2 border-2 border-dashed border-black bg-[#fef08a] px-2 py-1 font-mono text-[8px] font-bold uppercase">
                    Configura PUBLIC_URL con una URL pública para que este QR funcione fuera de
                    tu red.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!you || !session) return null;

  const isHost = you.isHost;
  const canStart = room.players.length >= 5 && room.players.length <= 8;
  const aiPlayers = room.players.filter((player) => player.isAi);
  const canAddAi = isHost && aiPlayers.length < RUINA_MAX_AI && room.players.length < 8;
  const shareLink = buildShareLink(room.code, publicConfig);

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
    <div className="min-h-screen bg-[#f4efe6] px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-[3px] border-black bg-[#fffdf7] p-3 shadow-[6px_6px_0_0_#000]">
          <div>
            <p className={`${BRUTAL.label} text-stone-500`}>SABOTEA LA JUNTA · TABLÓN DE ANUNCIOS</p>
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
              Código <span className="text-[#b91c1c]">{room.code}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RealtimeBadge realtime={supabaseRealtime} />
            <span className="border-2 border-black bg-[#fef08a] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
              LOBBY
            </span>
          </div>
        </header>

        <section className="relative mb-4 border-2 border-black bg-[#38bdf8] p-3 shadow-[5px_5px_0_0_#000]">
          <span className="tape -top-2 left-6" aria-hidden="true" />
          <p className={`${BRUTAL.label} text-stone-800`}>CÓDIGO PARA INVITAR</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="border-2 border-black bg-white px-2 py-1 font-mono text-4xl font-black leading-none tracking-[0.2em] shadow-[3px_3px_0_0_#000]">
              {room.code}
            </span>
            <div className="flex min-w-0 flex-1 gap-1.5">
              <input
                readOnly
                value={shareLink}
                className="min-w-0 flex-1 border-2 border-black bg-white px-2 py-1.5 font-mono text-[10px] text-stone-600"
              />
              <button
                type="button"
                onClick={() => void copy()}
                className={`${BRUTAL.buttonSm} bg-[#fef08a] px-2 py-1.5 font-mono text-[10px] font-black uppercase`}
              >
                {copied ? "COPIADO" : "COPIAR"}
              </button>
            </div>
          </div>

          <div className="mt-2 grid gap-2 border-2 border-black bg-white p-2 shadow-[3px_3px_0_0_#000] sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto border-2 border-black bg-[#fffdf7] p-1.5">
              <QRCodeSVG
                value={shareLink}
                size={128}
                bgColor="#fffdf7"
                fgColor="#111827"
                level="M"
                title={`Entrar en la sala ${room.code} desde el móvil`}
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="font-mono text-[10px] font-black uppercase tracking-wider">
                📱 Escanea para entrar desde el móvil
              </p>
              <p className="mt-1 break-all font-mono text-[9px] leading-relaxed text-stone-500">
                {shareLink}
              </p>
              <a
                href={shareLink}
                className="mt-1 inline-block border-2 border-black bg-[#38bdf8] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Abrir enlace
              </a>
              {shareLink.includes("localhost") && (
                <p className="mt-1 font-mono text-[8px] font-bold uppercase text-[#b91c1c]">
                  Configura PUBLIC_URL o abre el juego por la IP de tu red para que el QR funcione
                  en el móvil.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mb-4">
          <PortalScene room={room} you={you} />
        </div>

        <section className={`${BRUTAL.card} mb-4 p-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={`${BRUTAL.label} text-stone-500`}>MODO PRUEBA</p>
              <h2 className="text-lg font-black uppercase leading-none tracking-tight">
                Vecinos IA ({aiPlayers.length}/{RUINA_MAX_AI})
              </h2>
            </div>
            {isHost ? (
              <button
                type="button"
                disabled={!canAddAi}
                onClick={socket.addAi}
                className={`${BRUTAL.buttonSm} bg-[#fef08a] px-3 py-2 font-mono text-[10px] font-black uppercase`}
              >
                ➕ Añadir IA
              </button>
            ) : (
              <span className="font-mono text-[9px] font-bold uppercase text-stone-500">
                Solo el anfitrión añade IAs
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-stone-500">
            Las IAs ocupan asiento, reciben bando y secreto, y juegan solas nominación, votación
            y firma. Perfectas para probar la demo sin 5 pestañas.
          </p>
          {aiPlayers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {aiPlayers.map((ai) => (
                <span
                  key={ai.id}
                  className="inline-flex items-center gap-1 border-2 border-black bg-[#38bdf8] px-2 py-1 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  🤖 {ai.nombre} · {ai.piso}
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => socket.removeAi(ai.id)}
                      className="ml-1 border border-black bg-white px-1 font-black leading-none text-red-700 transition-all active:translate-y-[1px]"
                      aria-label={`Quitar ${ai.nombre}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className={`${BRUTAL.cardLg} p-3`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={`${BRUTAL.label} text-stone-500`}>ORDEN DEL DÍA</p>
              <h2 className="text-xl font-black uppercase leading-none tracking-tight">
                {room.players.length < 5 ? "Faltan vecinos" : "La junta puede empezar"}
              </h2>
            </div>
            <span className="rotate-2 border-2 border-black bg-[#fef08a] px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_0_#000]">
              {room.players.length}/8
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-stone-600">
            {room.players.length < 5
              ? `Faltan ${5 - room.players.length} vecinos para alcanzar el mínimo de 5.`
              : "El anfitrión decide cuándo se abre la sesión. Los demás podéis ir calentando la voz."}
          </p>
          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={socket.startGame}
              className={`${BRUTAL.button} mt-3 w-full bg-[#22c55e] px-4 py-3 text-base font-black uppercase tracking-wide text-white`}
            >
              🔔 Empezar la junta
            </button>
          ) : (
            <p className="mt-3 border-2 border-dashed border-black bg-[#fef08a] px-3 py-2 text-center font-mono text-xs font-bold uppercase">
              Esperando al anfitrión…
            </p>
          )}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RuinaAudio session={session} status={socket.status} />
          <RuinaChat
            room={room}
            you={you}
            connected={socket.status === "connected"}
            onSend={socket.sendChat}
          />
        </div>

        <footer className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase text-stone-500">
            {socket.status === "connected" ? "● CONECTADO" : "○ RECONECTANDO"}
          </span>
          <button
            type="button"
            onClick={socket.leave}
            className={`${BRUTAL.buttonSm} bg-white px-3 py-1.5 font-mono text-[10px] font-black uppercase`}
          >
            Salir
          </button>
        </footer>
      </div>
    </div>
  );
}
