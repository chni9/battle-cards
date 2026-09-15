/**
 * Closable game-over stats dialog — designer 2026-08-06 / Lot 60 gallery.
 * Sits over the finished board (`FinishedStateView.finalTable`); Esc / overlay dismiss.
 */

import {
  getKit,
  PROTOCOL_VERSION,
  type FinishedStateView,
  type KitId,
} from '@card-battle/shared';
import { useState, type CSSProperties, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { KitPortrait } from '../design/components/kit-portrait';
import { PlayerName } from '../design/components/player-name';
import { ResourceIcon } from '../design/components/resource-icon';
import {
  seatIndexOf,
  seatZoneStyle,
} from '../design/seat-colors';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../export/build-action-log-xlsx';
import {
  formatAwardValue,
  HIDDEN_KIT_LABEL,
  pickGameOverAwards,
  type AwardValueKind,
  type AwardWinner,
  type GameOverAward,
} from './game-over-awards';
import {
  DOWNLOAD_ACTION_LOG_LABEL,
  PLAY_AGAIN_LABEL,
  FEEDBACK_LABEL,
  gameOverLeaveLabel,
  gameOverTitle,
  showActionLogDownload,
  showPlayAgain,
} from './game-over-copy';

export interface GameOverDialogProps {
  open: boolean;
  view: FinishedStateView;
  onClose: () => void;
  onLeave: () => void;
  /** Classic rematch in this room (L57-12). Omit on tutorial. */
  onPlayAgain?: () => void;
  /** Opens Feedback in place of stats — never stacks (technical spec v6 §7.1). */
  onOpenFeedback: () => void;
}

function nickOf(view: FinishedStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

function kitLabel(kitId: KitId | undefined): string {
  return kitId === undefined ? HIDDEN_KIT_LABEL : getKit(kitId).name;
}

function winnerZoneStyle(view: FinishedStateView, playerId: string): CSSProperties {
  const index = seatIndexOf(view, playerId);
  return index === null ? {} : seatZoneStyle(index, { intensity: 'fill' });
}

function tileZoneStyle(view: FinishedStateView, playerId: string): CSSProperties {
  const index = seatIndexOf(view, playerId);
  return index === null ? {} : seatZoneStyle(index, { intensity: 'soft' });
}

function AwardValue({ kind, value }: { kind: AwardValueKind; value: number }): ReactElement {
  if (kind === 'points') {
    return <ResourceIcon kind="point" value={value} flyToken={false} />;
  }

  if (kind === 'lives') {
    return <ResourceIcon kind="life" value={value} flyToken={false} />;
  }

  if (kind === 'upgrade') {
    return <ResourceIcon kind="upgradePoint" value={value} flyToken={false} />;
  }

  return (
    <span className="font-semibold tabular-nums text-ink">{formatAwardValue(kind, value)}</span>
  );
}

function WinnerFaces({
  view,
  winners,
  portraitClassName,
}: {
  view: FinishedStateView;
  winners: readonly AwardWinner[];
  portraitClassName: string;
}): ReactElement {
  return (
    <ul className="mt-1 flex flex-wrap items-start justify-center gap-2">
      {winners.map((winner) => {
        const eliminated =
          view.players.find((player) => player.id === winner.playerId)?.isEliminated === true;

        return (
          <li key={winner.playerId} className="flex min-w-0 max-w-[7rem] flex-col items-center">
            <KitPortrait
              kitId={winner.kitId ?? null}
              nickname={nickOf(view, winner.playerId)}
              isEliminated={eliminated}
              className={portraitClassName}
            />
            <PlayerName
              className="mt-1 max-w-full truncate text-center text-xs"
              nickname={nickOf(view, winner.playerId)}
              playerId={winner.playerId}
              view={view}
            />
            <span className="max-w-full truncate text-center text-[10px] font-medium text-ink-muted">
              {kitLabel(winner.kitId)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AwardTile({
  view,
  award,
}: {
  view: FinishedStateView;
  award: GameOverAward;
}): ReactElement {
  const lead = award.winners[0];
  const chrome = lead === undefined ? {} : tileZoneStyle(view, lead.playerId);
  const value = lead?.value ?? 0;

  return (
    <li
      data-award-id={award.id}
      className="flex min-h-0 min-w-0 flex-col rounded-[length:var(--radius-card)] border p-2"
      style={chrome}
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink">
        {award.title}
      </p>
      <WinnerFaces view={view} winners={award.winners} portraitClassName="w-full max-w-[4.5rem]" />
      <div className="mt-1 flex justify-center">
        <AwardValue kind={award.valueKind} value={value} />
      </div>
    </li>
  );
}

export function GameOverDialog({
  open,
  view,
  onClose,
  onLeave,
  onPlayAgain,
  onOpenFeedback,
}: GameOverDialogProps): ReactElement {
  const winnerNick = nickOf(view, view.winnerPlayerId);
  const youWon = view.winnerPlayerId === view.you;
  const winnerRow = view.recap.players.find((row) => row.playerId === view.winnerPlayerId);
  const winnerEliminated =
    view.players.find((player) => player.id === view.winnerPlayerId)?.isEliminated === true;
  const awards = pickGameOverAwards(view.recap);
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
      panelClassName="max-w-3xl !bg-[color-mix(in_srgb,var(--color-slate)_38%,var(--color-surface-kit))]"
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
          {showPlayAgain(view.playKind) && onPlayAgain !== undefined ? (
            <Button compact type="button" variant="green" onClick={onPlayAgain}>
              {PLAY_AGAIN_LABEL}
            </Button>
          ) : null}
          <Button compact type="button" variant="red" onClick={onLeave}>
            {gameOverLeaveLabel(view.playKind)}
          </Button>
        </>
      }
    >
      <div
        className="rounded-[length:var(--radius-card)] border p-3 text-ink"
        style={winnerZoneStyle(view, view.winnerPlayerId)}
        data-zone="game-over-winner"
      >
        <div className="flex flex-wrap items-center gap-3">
          <KitPortrait
            kitId={winnerRow?.kitId ?? null}
            nickname={winnerNick}
            isEliminated={winnerEliminated}
            className="w-24 max-w-[6.5rem] shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Winner</p>
            <p className="text-lg font-semibold leading-tight">
              <PlayerName nickname={winnerNick} playerId={view.winnerPlayerId} view={view} />
              {youWon ? ' (you)' : ''}
            </p>
            <p className="mt-0.5 text-sm font-medium">{kitLabel(winnerRow?.kitId)}</p>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-ink-muted">
        Protocol v{PROTOCOL_VERSION} · Code {view.gameCode} · {view.recap.turnSequence} turns
      </p>

      {awards.length > 0 ? (
        <ul
          data-zone="game-over-awards"
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        >
          {awards.map((award) => (
            <AwardTile key={award.id} view={view} award={award} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-center text-sm text-ink-muted">No awards this match.</p>
      )}

      <h3 className="mt-4 text-sm font-semibold text-ink">Eliminations</h3>
      {view.recap.eliminations.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">No eliminations</p>
      ) : (
        <ul data-zone="game-over-elims" className="mt-2 space-y-1">
          {view.recap.eliminations.map((entry) => {
            const style = tileZoneStyle(view, entry.playerId);

            return (
              <li
                key={`${entry.playerId}-${entry.reason}`}
                className="rounded-[length:var(--radius-card)] border px-2 py-1 text-sm text-ink"
                style={style}
              >
                <PlayerName
                  nickname={nickOf(view, entry.playerId)}
                  playerId={entry.playerId}
                  view={view}
                />{' '}
                eliminated ({entry.reason})
                {entry.eliminatorPlayerId !== null ? (
                  <>
                    {' '}
                    by{' '}
                    <PlayerName
                      nickname={nickOf(view, entry.eliminatorPlayerId)}
                      playerId={entry.eliminatorPlayerId}
                      view={view}
                    />
                  </>
                ) : null}
              </li>
            );
          })}
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
