/**
 * Lobby screen — technical spec v2 §6, L11-02.
 * Seats, copyable game code, host Start; same intents as V1.
 */

import { PROTOCOL_VERSION, type LobbyStateView } from '@card-battle/shared';
import { useCallback, useState, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import type { RoomConnectionStatus } from '../net/use-room-connection';
import { STATUS_LABELS } from './status-labels';

export interface LobbyScreenProps {
  view: LobbyStateView;
  status: RoomConnectionStatus;
  error: string | null;
  onStart: () => void;
  onLeave: () => void;
}

export function LobbyScreen({
  view,
  status,
  error,
  onStart,
  onLeave,
}: LobbyScreenProps): ReactElement {
  const isHost = view.hostPlayerId === view.you;
  const canLaunch = isHost && view.players.length >= 2;
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const closeCopyDialog = useCallback(() => {
    setCopyOpen(false);
  }, []);

  const onCopyCode = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(view.gameCode);
        setCopyFailed(false);
        setCopyOpen(true);
      } catch {
        setCopyFailed(true);
        setCopyOpen(true);
      }
    })();
  }, [view.gameCode]);

  return (
    <main className="min-h-[100dvh] bg-surface font-sans text-ink">
      <div className="mx-auto max-w-lg px-4 py-8 md:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          Lobby
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Card Battle</h1>
        <p className="mt-2 text-xs text-ink-muted">Protocol v{PROTOCOL_VERSION}</p>
        <p className="mt-1 text-sm text-ink-muted">{STATUS_LABELS[status]}</p>
        {error !== null && (
          <p className="mt-2 text-sm font-medium text-cta-red" role="alert">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
          <h2 className="text-sm font-medium text-ink-muted">Game code</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-sans text-2xl font-semibold tracking-[0.2em] text-ink">
              {view.gameCode}
            </p>
            <Button type="button" variant="orange" onClick={onCopyCode}>
              Copy
            </Button>
          </div>
          {isHost && (
            <p className="mt-2 text-sm text-ink-muted">You are the host</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">
            Players ({view.players.length}/4)
          </h2>
          <ul className="mt-3 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
            {view.players.map((player) => (
              <li
                key={player.id}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink">
                  {player.nickname}
                  {player.id === view.you ? ' (you)' : ''}
                </span>
                {player.id === view.hostPlayerId && (
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          {isHost && (
            <Button type="button" variant="green" disabled={!canLaunch} onClick={onStart}>
              Start game
            </Button>
          )}
          {!isHost && (
            <p className="self-center text-sm text-ink-muted">
              Waiting for the host to start…
            </p>
          )}
          <Button type="button" variant="red" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>

      <Dialog
        open={copyOpen}
        title={copyFailed ? 'Copy failed' : 'Code copied'}
        onClose={closeCopyDialog}
        actions={
          <Button type="button" variant="green" onClick={closeCopyDialog}>
            OK
          </Button>
        }
      >
        {copyFailed
          ? `Could not copy automatically. Game code: ${view.gameCode}`
          : `Share this code with friends: ${view.gameCode}`}
      </Dialog>
    </main>
  );
}
