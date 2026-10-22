import { useMemo, useState } from "react";
import {
  GAME_CONFIG,
  ROLES,
  aiPlayers,
  humanPlayers,
  planComposition,
  type Phase,
  type PlayerState,
  type RoomState,
  type SelfState,
} from "@shared/index";
import type { ConnectionStatus } from "../hooks/useGameSocket";

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
  status: ConnectionStatus;
  onAddAi: () => void;
  onRemoveAi: (playerId: string) => void;
  onStart: () => void;
  onLeave: () => void;
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
  status,
  onAddAi,
  onRemoveAi,
  onStart,
  onLeave,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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
        </span>
      </header>

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
        <p className="hint">Ronda {Math.max(room.round, 1)} de {GAME_CONFIG.ROUNDS}</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Vecinos ({room.players.length}/{GAME_CONFIG.MAX_PARTICIPANTS})</h2>
          <span className="live-dot" data-state={status} title={`Conexión: ${status}`} />
        </div>

        <ul className="player-list">
          {players.map((player) => {
            const role = player.roleId ? ROLES[player.roleId] : null;
            return (
              <li key={player.id} className={player.connected ? "player-row" : "player-row offline"}>
                <span className="avatar" data-kind={player.kind}>
                  {initials(player.name)}
                </span>
                <div className="player-main">
                  <div className="player-name">
                    {player.name}
                    {player.id === you.playerId && <span className="badge badge-you">Tú</span>}
                    {player.isHost && <span className="badge">Anfitrión</span>}
                    {player.kind === "ai" && <span className="badge badge-ai">IA</span>}
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
              disabled={ais.length >= GAME_CONFIG.MAX_AI_PLAYERS || room.players.length >= GAME_CONFIG.MAX_PARTICIPANTS}
            >
              + Añadir vecino IA
            </button>
            <button className="btn btn-primary" type="button" onClick={onStart} disabled={!plan.ok}>
              Empezar la junta
            </button>
          </div>
        )}

        {inLobby && !isHost && (
          <p className="hint center">El anfitrión decidirá cuándo empezar. Ve calentando la voz.</p>
        )}
      </section>

      {!inLobby && (
        <section className="card">
          <h2>Roles repartidos</h2>
          <p className="hint">
            Se mantienen durante toda la partida. La discusión por voz llega en el Hito 2/4.
          </p>
          <div className="role-grid">
            {players.map((player) => {
              const role = player.roleId ? ROLES[player.roleId] : null;
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
