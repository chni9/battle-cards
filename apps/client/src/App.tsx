/**
 * Home, lobby, table, and end screens — technical spec §7.
 * Functional only; no design system (see docs/agent/frontend.md).
 */

import { PROTOCOL_VERSION, type PlayingStateView } from '@card-battle/shared';
import { useEffect, useState } from 'react';

import { useRoomConnection } from './net/use-room-connection';

const STATUS_LABELS = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  failed: 'Could not join',
} as const;

export function App() {
  const connection = useRoomConnection();
  const {
    status,
    view,
    error,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    drawCard,
    playCard,
    lastTurnStarted,
  } = connection;
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [targetId, setTargetId] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const canSubmit = nickname.trim().length > 0 && status !== 'connecting';

  if (view?.phase === 'finished') {
    const winner = view.players.find((player) => player.id === view.winnerPlayerId);

    return (
      <main>
        <h1>Card Battle</h1>
        <h2>Game over</h2>
        <p>Winner: {winner?.nickname ?? view.winnerPlayerId}</p>
        <ul>
          {view.players.map((player) => (
            <li key={player.id}>
              {player.nickname}: {player.lives} lives
              {player.isEliminated ? ' (eliminated)' : ''}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void leaveGame()}>
          Return home
        </button>
      </main>
    );
  }

  if (view?.phase === 'playing') {
    return (
      <TableScreen
        view={view}
        error={error}
        statusLabel={STATUS_LABELS[status]}
        nowMs={nowMs}
        deadlineMs={lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs}
        targetId={targetId}
        setTargetId={setTargetId}
        onDraw={drawCard}
        onAttack={() => {
          if (targetId !== '') {
            playCard('basic-attack', targetId);
          }
        }}
        onLeave={() => {
          void leaveGame();
        }}
      />
    );
  }

  if (view?.phase === 'lobby') {
    const isHost = view.hostPlayerId === view.you;
    const canLaunch = isHost && view.players.length >= 2;

    return (
      <main>
        <h1>Card Battle</h1>
        <p>Protocol v{PROTOCOL_VERSION}</p>
        <h2>Lobby</h2>
        <p>
          Game code: <strong>{view.gameCode}</strong>
          {isHost ? ' (you are the host)' : ''}
        </p>
        <p>{STATUS_LABELS[status]}</p>
        {error !== null && <p>{error}</p>}
        <h3>Players ({view.players.length}/4)</h3>
        <ul>
          {view.players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              {player.id === view.you ? ' (you)' : ''}
              {player.id === view.hostPlayerId ? ' — host' : ''}
            </li>
          ))}
        </ul>
        {isHost && (
          <button type="button" disabled={!canLaunch} onClick={startGame}>
            Start game
          </button>
        )}
        {!isHost && <p>Waiting for the host to start…</p>}
        <button type="button" onClick={() => void leaveGame()}>
          Leave
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Card Battle</h1>
      <p>Protocol v{PROTOCOL_VERSION}</p>
      <p>{STATUS_LABELS[status]}</p>
      {error !== null && <p>{error}</p>}

      <label>
        Nickname
        <input
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
          }}
          maxLength={24}
          autoComplete="nickname"
        />
      </label>

      <section>
        <h2>Create a game</h2>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            void createGame(nickname);
          }}
        >
          Create
        </button>
      </section>

      <section>
        <h2>Join a game</h2>
        <label>
          Game code
          <input
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value.toUpperCase());
            }}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          disabled={!canSubmit || joinCode.trim().length !== 6}
          onClick={() => {
            void joinGame(joinCode, nickname);
          }}
        >
          Join
        </button>
      </section>
    </main>
  );
}

function TableScreen(props: {
  view: PlayingStateView;
  error: string | null;
  statusLabel: string;
  nowMs: number;
  deadlineMs: number | null;
  targetId: string;
  setTargetId: (id: string) => void;
  onDraw: () => void;
  onAttack: () => void;
  onLeave: () => void;
}) {
  const {
    view,
    error,
    statusLabel,
    nowMs,
    deadlineMs,
    targetId,
    setTargetId,
    onDraw,
    onAttack,
    onLeave,
  } = props;

  const isMyTurn = view.currentTurnPlayerId === view.you;
  const secondsLeft =
    deadlineMs === null ? null : Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  const opponents = view.players.filter((player) => !player.isYou);

  useEffect(() => {
    if (targetId === '' && opponents[0] !== undefined) {
      setTargetId(opponents[0].id);
    }
  }, [opponents, setTargetId, targetId]);

  return (
    <main>
      <h1>Card Battle</h1>
      <p>
        Code {view.gameCode} · {statusLabel}
      </p>
      {error !== null && <p>{error}</p>}

      <section>
        <h2>Turn</h2>
        <p>
          Active:{' '}
          {view.players.find((player) => player.id === view.currentTurnPlayerId)?.nickname ??
            '—'}
          {isMyTurn ? ' (you)' : ''}
        </p>
        <p>Timer: {secondsLeft === null ? '—' : `${secondsLeft}s`}</p>
      </section>

      <section>
        <h2>Opponents</h2>
        <ul>
          {opponents.map((player) => (
            <li key={player.id}>
              <label>
                <input
                  type="radio"
                  name="target"
                  checked={targetId === player.id}
                  disabled={player.isEliminated}
                  onChange={() => {
                    setTargetId(player.id);
                  }}
                />
                {player.nickname} — {player.lives} lives, shield {player.shield},{' '}
                {player.cardCount} cards
                {player.isEliminated ? ' (eliminated)' : ''}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Pending effects</h2>
        {view.pendingEffects.length === 0 ? (
          <p>None</p>
        ) : (
          <ul>
            {view.pendingEffects.map((effect) => (
              <li key={effect.id}>
                {effect.cardId} from {nicknameOf(view, effect.sourcePlayerId)} →{' '}
                {nicknameOf(view, effect.targetPlayerId)} (queuedAt {effect.queuedAt})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Action log</h2>
        {view.actionLog.length === 0 ? (
          <p>No actions yet</p>
        ) : (
          <ol>
            {view.actionLog.map((entry, index) => (
              <li key={`${entry.turnSequence}-${index}`}>
                {nicknameOf(view, entry.actorPlayerId)}: {entry.action}
                {entry.cardId !== undefined ? ` ${entry.cardId}` : ''}
                {entry.targetPlayerId !== undefined
                  ? ` → ${nicknameOf(view, entry.targetPlayerId)}`
                  : ''}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>Your zone</h2>
        <p>
          Lives{' '}
          {view.players.find((player) => player.isYou)?.lives ?? '—'} · Points {view.self.points} ·
          Upgrade points {view.self.upgradePoints} · Kit {view.self.kitId}
        </p>
        <p>
          Hand: {view.self.hand.length}× basic-attack (and{' '}
          {view.self.hand.filter((card) => card.cardId !== 'basic-attack').length} other)
        </p>
      </section>

      <section>
        <h2>Actions</h2>
        <button type="button" disabled={!isMyTurn} onClick={onDraw}>
          Draw (+1 point)
        </button>
        <button type="button" disabled={!isMyTurn || targetId === ''} onClick={onAttack}>
          Basic attack
        </button>
      </section>

      <button type="button" onClick={onLeave}>
        Leave
      </button>
    </main>
  );
}

function nicknameOf(view: PlayingStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}
