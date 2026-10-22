import { useEffect, useMemo, useState } from "react";
import {
  GAME_CONFIG,
  aiPlayers,
  getEffectiveRole,
  humanPlayers,
  planComposition,
  type Phase,
  type PlayerState,
  type RoomState,
  type SelfState,
} from "@shared/index";
import type { ConnectionStatus } from "../hooks/useGameSocket";
import { useLiveKit } from "../hooks/useLiveKit";
import type { Session } from "../lib/session";
import { AudioPanel } from "./AudioPanel";
import { TranscriptPanel } from "./TranscriptPanel";

const PHASE_LABELS: Record<Phase, string> = {
  LOBBY: "Lobby",
  ROLES: "Reparto de roles",
  DISCUSSION: "Discusión",
  JUDGMENT: "Juicio",
  RESULTS_SHOP: "Resultados y tienda",
};

interface LobbyProps {
  room: RoomState;
  you: SelfState;
  session: Session;
  status: ConnectionStatus;
  onAddAi: () => void;
  onRemoveAi: (playerId: string) => void;
  onStart: () => void;
  onStartDiscussion: () => void;
  onLeave: () => void;
  onSendChat: (text: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError: (message: string) => void;
  judgeMessage: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function sortPlayers(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "human" ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });
}

export function Lobby({
  room,
  you,
  session,
  status,
  onAddAi,
  onRemoveAi,
  onStart,
  onStartDiscussion,
  onLeave,
  onSendChat,
  onSpeakingChange,
  onError,
  judgeMessage,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (room.phase !== "DISCUSSION") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room.phase, room.discussionEndsAt]);

  const remainingSeconds = room.discussionEndsAt
    ? Math.max(0, Math.ceil((room.discussionEndsAt - now) / 1000))
    : null;
  const countdown = remainingSeconds !== null
    ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`
    : null;

  const humans = humanPlayers(room.players);
  const ais = aiPlayers(room.players);
  const plan = useMemo(
    () => planComposition({ humans: humans.length, ai: ais.length }),
    [humans.length, ais.length],
  );

  const players = sortPlayers(room.players);
  const isHost = you.isHost;
  const inLobby = room.phase === "LOBBY";
  const shareLink = `${window.location.origin}/sala/${room.code}`;

  const audio = useLiveKit({
    session,
    enabled: status === "connected",
    onSpeakingChange,
  });

  const speakingIds = new Set<string>(audio.speakingIds);
  for (const player of room.players) {
    if (player.speaking) speakingIds.add(player.id);
  }
  const speakingNames = players
    .filter((player) => speakingIds.has(player.id))
    .map((player) => player.name);

  async function copyLink(): Promise<void> {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div>
          <p className="eyebrow">Junta de vecinos</p>
          <h1>
            Sala <span className="code-inline">{room.code}</span>
          </h1>
        </div>
        <span className={`phase-pill phase-${room.phase.toLowerCase()}`}>
          {PHASE_LABELS[room.phase]}
          {room.phase === "DISCUSSION" && countdown ? ` · ${countdown}` : ""}
        </span>
      </header>

      {judgeMessage && (
        <div className="judge-overlay" role="status">
          <span className="judge-megaphone" aria-hidden="true">📢</span>
          <p>{judgeMessage}</p>
        </div>
      )}

      <section className="code-card">
        <p className="label">Código para invitar</p>
        <div className="code-value">{room.code}</div>
        <div className="link-row">
          <input
            className="share-input"
            readOnly
            value={shareLink}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Enlace para invitar"
          />
          <button className="btn btn-small btn-secondary" type="button" onClick={() => void copyLink()}>
            Copiar
          </button>
        </div>
        {copied && <p className="hint good">Enlace copiado al portapapeles.</p>}
        {copyFailed && (
          <p className="hint warn">No se pudo copiar. Selecciona el enlace y cópialo a mano.</p>
        )}
      </section>

      <section className="card proposal">
        <p className="label">Propuesta de la comunidad</p>
        <h2>{room.proposal}</h2>
        <p className="hint">
          Ronda {Math.max(room.round, 1)} de {GAME_CONFIG.ROUNDS}
        </p>
      </section>

      <AudioPanel audio={audio} session={session} speakingNames={speakingNames} onError={onError} />

      <TranscriptPanel
        entries={room.transcript}
        youId={you.playerId}
        presidentStyleId={room.presidentStyleId}
        chatDisabled={status !== "connected"}
        onSendChat={onSendChat}
      />

      <section className="card">
        <div className="card-head">
          <h2>
            Vecinos ({room.players.length}/{GAME_CONFIG.MAX_PARTICIPANTS})
          </h2>
          <span className="live-dot" data-state={status} title={`Conexión: ${status}`} />
        </div>

        <ul className="player-list">
          {players.map((player) => {
            const role = player.roleId
              ? getEffectiveRole(player.roleId, room.presidentStyleId)
              : null;
            const isSpeaking = speakingIds.has(player.id) && player.connected;
            return (
              <li
                key={player.id}
                className={`player-row ${player.connected ? "" : "offline"} ${
                  isSpeaking ? "speaking" : ""
                }`}
              >
                <span className="avatar" data-kind={player.kind}>
                  {initials(player.name)}
                </span>
                <div className="player-main">
                  <div className="player-name">
                    {player.name}
                    {player.id === you.playerId && <span className="badge badge-you">Tú</span>}
                    {player.isHost && <span className="badge">Anfitrión</span>}
                    {player.kind === "ai" && <span className="badge badge-ai">IA</span>}
                    {isSpeaking && <span className="badge badge-speaking">Hablando</span>}
                    {!player.connected && <span className="badge badge-offline">Desconectado</span>}
                  </div>
                  <p className="player-role">
                    {role ? role.name : inLobby ? "Sin rol todavía" : "Vecino"}
                    {role && !role.votes && <span className="badge badge-novote">Sin voto</span>}
                  </p>
                </div>
                {isHost && inLobby && player.kind === "ai" && (
                  <button
                    className="btn-icon"
                    type="button"
                    onClick={() => onRemoveAi(player.id)}
                    aria-label={`Quitar a ${player.name}`}
                    title="Quitar vecino IA"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="stats">
          <div>
            <strong>{humans.length}</strong>
            <span>humanos</span>
          </div>
          <div>
            <strong>{ais.length}</strong>
            <span>IA (máx. {GAME_CONFIG.MAX_AI_PLAYERS})</span>
          </div>
          <div>
            <strong>{room.players.length}</strong>
            <span>total (mín. {GAME_CONFIG.MIN_PARTICIPANTS})</span>
          </div>
        </div>

        {inLobby && (
          <div className="composition">
            {plan.aiToAdd > 0 && (
              <p className="hint">
                Al empezar se añadirán <strong>{plan.aiToAdd} vecinos IA</strong> para llegar al
                mínimo de {GAME_CONFIG.MIN_PARTICIPANTS} participantes.
              </p>
            )}
            {!plan.ok && (
              <ul className="error-list">
                {plan.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {inLobby && isHost && (
          <div className="actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onAddAi}
              disabled={
                ais.length >= GAME_CONFIG.MAX_AI_PLAYERS ||
                room.players.length >= GAME_CONFIG.MAX_PARTICIPANTS
              }
            >
              + Añadir vecino IA
            </button>
            <button className="btn btn-primary" type="button" onClick={onStart} disabled={!plan.ok}>
              Empezar la junta
            </button>
          </div>
        )}

        {inLobby && !isHost && (
          <p className="hint center">
            El anfitrión decidirá cuándo empezar. Ve calentando la voz: el audio ya está abierto.
          </p>
        )}
      </section>

      {room.phase === "ROLES" && (
        <section className="card discussion-card">
          <div className="card-head">
            <h2>La junta va a comenzar</h2>
            <span className="badge">4:00</span>
          </div>
          <p className="hint">
            Cuando empiece la discusión, habla por LiveKit. Los vecinos IA escucharán y
            intervendrán cuando haya un silencio. El juez solo aparecerá si el portal se
            desmadra.
          </p>
          {isHost ? (
            <button className="btn btn-primary" type="button" onClick={onStartDiscussion}>
              Comenzar discusión
            </button>
          ) : (
            <p className="hint center">Esperando a que el anfitrión abra la discusión…</p>
          )}
        </section>
      )}

      {room.phase === "DISCUSSION" && (
        <section className="card discussion-card live">
          <div className="card-head">
            <h2>Discusión en curso</h2>
            <span className="timer">{countdown ?? "4:00"}</span>
          </div>
          <p className="hint">
            La IA escucha. Si hablas, se cancelan las respuestas pendientes de los vecinos IA.
            El juez interviene si hay 4 o más personas hablando a la vez.
          </p>
        </section>
      )}

      {room.phase === "JUDGMENT" && (
        <section className="card discussion-card">
          <div className="card-head">
            <h2>El juez está deliberando</h2>
            <span className="badge">Acta</span>
          </div>
          <p className="hint">
            La discusión ha terminado. El juez revisará las tareas y las intervenciones de la
            ronda. Los resultados y el dinero llegarán en el siguiente hito.
          </p>
        </section>
      )}

      {!inLobby && (
        <section className="card">
          <h2>Roles repartidos</h2>
          <p className="hint">
            Se mantienen durante toda la partida. Habla por LiveKit y usa el push-to-talk para dejar
            tus intervenciones en el acta.
          </p>
          <div className="role-grid">
            {players.map((player) => {
              const role = player.roleId
                ? getEffectiveRole(player.roleId, room.presidentStyleId)
                : null;
              if (!role) return null;
              return (
                <article className="role-card" key={player.id}>
                  <div className="role-card-head">
                    <span className="avatar" data-kind={player.kind}>
                      {initials(player.name)}
                    </span>
                    <div>
                      <strong>{player.name}</strong>
                      <p className="label">{role.name}</p>
                    </div>
                  </div>
                  <p>{role.description}</p>
                  <ul className="behavior-list">
                    {role.expectedBehaviors.map((behavior) => (
                      <li key={behavior}>{behavior}</li>
                    ))}
                  </ul>
                  <span className={`badge ${role.votes ? "badge-vote" : "badge-novote"}`}>
                    {role.votes ? "Con voto" : "Sin voto"}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <footer className="lobby-footer">
        <span className="connection-label" data-state={status}>
          {status === "connected"
            ? "Conectado"
            : status === "reconnecting"
              ? "Reconectando…"
              : status === "connecting"
                ? "Conectando…"
                : "Sin conexión"}
        </span>
        <button className="btn btn-ghost" type="button" onClick={onLeave}>
          Salir de la sala
        </button>
      </footer>
    </div>
  );
}
