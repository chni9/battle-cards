/**
 * Closable game-over stats dialog — designer 2026-08-06.
 * Sits over the finished board (`FinishedStateView.finalTable`); Esc / overlay dismiss.
 */

import { PROTOCOL_VERSION, type FinishedStateView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../export/build-action-log-xlsx';
import {
  DOWNLOAD_ACTION_LOG_LABEL,
  FEEDBACK_LABEL,
  gameOverLeaveLabel,
  gameOverTitle,
  showActionLogDownload,
} from './game-over-copy';

export interface GameOverDialogProps {
  open: boolean;
  view: FinishedStateView;
  onClose: () => void;
  onLeave: () => void;
  /** Opens Feedback in place of stats — never stacks (technical spec v6 §7.1). */
  onOpenFeedback: () => void;
}

function nickOf(view: FinishedStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

export function GameOverDialog({
  open,
  view,
  onClose,
  onLeave,
  onOpenFeedback,
}: GameOverDialogProps): ReactElement {
  const winnerNick = nickOf(view, view.winnerPlayerId);
  const youWon = view.winnerPlayerId === view.you;
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const allowExcel = showActionLogDownload(import.meta.env.DEV);

  async function onExportLog(): Promise<void> {
    setExportBusy(true);
    setExportError(null);

    try {
      const buffer = await buildActionLogWorkbook(view.exportLog);
      downloadWorkbookBuffer(buffer, `${view.gameCode}-action-log.xlsx`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={gameOverTitle(view.playKind)}
      onClose={onClose}
      closeOnOverlayClick
      panelClassName="max-w-lg"
      actions={
        <>
          {allowExcel ? (
            <Button
              compact
              type="button"
              variant="purple"
              disabled={exportBusy}
              onClick={() => {
                void onExportLog();
              }}
            >
              {exportBusy ? 'Building Excel…' : DOWNLOAD_ACTION_LOG_LABEL}
            </Button>
          ) : null}
          <Button compact type="button" variant="orange" onClick={onOpenFeedback}>
            {FEEDBACK_LABEL}
          </Button>
          <Button compact type="button" variant="orange" onClick={onClose}>
            View board
          </Button>
          <Button compact type="button" variant="red" onClick={onLeave}>
            {gameOverLeaveLabel(view.playKind)}
          </Button>
        </>
      }
    >
      <p className="text-base font-semibold text-ink">
        Winner: {winnerNick}
        {youWon ? ' (you)' : ''}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Protocol v{PROTOCOL_VERSION} · Code {view.gameCode}
      </p>

      <h3 className="mt-4 text-sm font-semibold text-ink">Players</h3>
      <ul className="mt-2 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface">
        {view.players.map((player) => (
          <li
            key={player.id}
            className="flex min-h-10 items-center justify-between gap-3 px-3 py-2 text-sm text-ink"
          >
            <span className="font-medium">
              {player.nickname}
              {player.isYou ? ' (you)' : ''}
              {player.id === view.winnerPlayerId ? ' · winner' : ''}
            </span>
            {player.isEliminated && (
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Eliminated
              </span>
            )}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Recap</h3>
      <p className="mt-1 text-sm">Turns played: {view.recap.turnSequence}</p>
      <ul className="mt-2 space-y-1.5">
        {view.recap.players.map((row) => (
          <li key={row.playerId} className="text-sm text-ink">
            <span className="font-medium">{nickOf(view, row.playerId)}</span>
            {' — '}
            played {row.cardsPlayedCount}, bought {row.buyCount}, sold {row.sellCount},
            upgraded {row.upgradeCount}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Eliminations</h3>
      {view.recap.eliminations.length === 0 ? (
        <p className="mt-1 text-sm">No eliminations</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {view.recap.eliminations.map((entry) => (
            <li key={`${entry.playerId}-${entry.reason}`} className="text-sm text-ink">
              {nickOf(view, entry.playerId)} eliminated ({entry.reason})
              {entry.eliminatorPlayerId !== null
                ? ` by ${nickOf(view, entry.eliminatorPlayerId)}`
                : ''}
            </li>
          ))}
        </ul>
      )}

      {exportError !== null && (
        <p className="mt-3 text-sm text-ink" role="alert">
          {exportError}
        </p>
      )}
    </Dialog>
  );
}
