/**
 * The Matches detail dialog (technical spec v7 §7.8, L80-07), on the V7 Dialog in tool mode. It
 * holds the facts of one finished match, its seats, its elimination order, the replay seed and
 * the action-log download, and nothing else: no rules and no chat (spec v7 §13 Q80, §14.1). The
 * caller owns the detail request and the URL; this file only shows what it is given and closes
 * through `onClose`.
 */

import type { AdminGameDetail, AdminGameSeat } from '@card-battle/shared';
import { useState, type ReactElement, type ReactNode } from 'react';

import {
  eliminationReasonLabel,
  eliminatorNickname,
  formatDateTime,
  formatMinutesFromMs,
  formatTurns,
  gameModeLabel,
  gameNotesLabel,
  kitDisplayName,
} from '../../admin/admin-present';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../../export/build-action-log-xlsx';
import { Button } from '../../ui/primitives/button';
import { Dialog } from '../../ui/primitives/dialog';
import { ADMIN_BODY_TEXT_CLASS, ADMIN_CAPTION_CLASS, ADMIN_FIELD_LABEL_CLASS } from './admin-classes';
import { AdminDataTable, AdminStatus, type AdminTableColumn } from './admin-ui';

/** The only failure the dialog names: the workbook could not be built or handed to the browser. */
const BUILD_FAILED_COPY = 'Could not build the action log.';

/** Winner > Bot > Eliminated > Player: a winning bot is still the Winner (Lot 62). */
function seatRole(seat: AdminGameSeat): string {
  if (seat.isWinner) {
    return 'Winner';
  }
  if (seat.isBot) {
    return 'Bot';
  }
  if (seat.isEliminated) {
    return 'Eliminated';
  }
  return 'Player';
}

const seatColumns: AdminTableColumn<AdminGameSeat>[] = [
  { id: 'nick', header: 'Player', cell: (seat) => seat.nickname ?? '—' },
  { id: 'kit', header: 'Kit', cell: (seat) => kitDisplayName(seat.kitId) },
  { id: 'lives', header: 'Lives', align: 'right', cell: (seat) => seat.lives },
  { id: 'points', header: 'Points', align: 'right', cell: (seat) => seat.points },
  { id: 'role', header: 'Role', cell: seatRole },
];

function Fact({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div>
      <dt className={ADMIN_FIELD_LABEL_CLASS}>{label}</dt>
      <dd className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text`}>{children}</dd>
    </div>
  );
}

/**
 * One download in flight or failed, tied to the detail object it started from. A fresh fetch of
 * the same match is a new object, so a failure never greets the next opening, and a download
 * that was started in one match never shows as busy in another.
 */
interface DownloadState {
  detail: AdminGameDetail;
  phase: 'busy' | 'failed';
}

export function AdminGameDetailDialog({
  detail,
  onClose,
}: {
  detail: AdminGameDetail | null;
  onClose: () => void;
}): ReactElement {
  const [download, setDownload] = useState<DownloadState | null>(null);
  const phase = download !== null && download.detail === detail ? download.phase : null;
  const busy = phase === 'busy';

  const startDownload = async (): Promise<void> => {
    const exportLog = detail?.exportLog;
    if (detail === null || exportLog === undefined || busy) {
      return;
    }
    setDownload({ detail, phase: 'busy' });
    try {
      const buffer = await buildActionLogWorkbook(exportLog);
      downloadWorkbookBuffer(buffer, `${detail.roomId}.xlsx`);
      setDownload((current) => (current?.detail === detail ? null : current));
    } catch {
      setDownload((current) => (current?.detail === detail ? { detail, phase: 'failed' } : current));
    }
  };

  return (
    <Dialog
      open={detail !== null}
      title={detail === null ? 'Match' : `Match ${detail.roomId}`}
      width="2xl"
      dataAttributes={{ 'data-mode': 'tool' }}
      onClose={onClose}
      actions={
        <>
          {detail?.exportLog !== undefined ? (
            // Busy is `aria-disabled`, not native `disabled`: the pressed button keeps focus
            // inside the dialog (frontend.md › V7 primitives).
            <Button
              variant="quiet"
              disabled={busy}
              focusableWhenDisabled
              onClick={() => {
                void startDownload();
              }}
            >
              {busy ? 'Downloading…' : 'Download action log'}
            </Button>
          ) : null}
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {detail !== null ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Fact label="Started">{formatDateTime(detail.startedAt)}</Fact>
            <Fact label="Ended">{formatDateTime(detail.endedAt)}</Fact>
            <Fact label="Mode">{gameModeLabel(detail.mode)}</Fact>
            <Fact label="Length">{formatMinutesFromMs(detail.durationMs)}</Fact>
            <Fact label="Turns">{formatTurns(detail.turnSequence)}</Fact>
            <Fact label="Winner">{detail.winnerNickname ?? 'Unknown'}</Fact>
            <Fact label="Notes">{gameNotesLabel(detail)}</Fact>
          </dl>
          <section className="space-y-2">
            <h3 className={ADMIN_CAPTION_CLASS}>Seats</h3>
            <AdminDataTable
              label="Seats"
              columns={seatColumns}
              rows={detail.seats}
              rowKey={(seat) => seat.playerId}
            />
          </section>
          {detail.eliminations.length > 0 ? (
            <section className="space-y-2">
              <h3 className={ADMIN_CAPTION_CLASS}>Elimination order</h3>
              <ol className={`list-decimal space-y-1 pl-5 ${ADMIN_BODY_TEXT_CLASS} text-v7-text`}>
                {detail.eliminations.map((elimination) => {
                  const eliminator = eliminatorNickname(detail, elimination);
                  const victim = elimination.nickname ?? 'Unknown';
                  const by = eliminator === null ? '' : ` · by ${eliminator}`;
                  return (
                    <li key={elimination.orderIndex}>
                      {`${victim} — ${eliminationReasonLabel(elimination.reason)}${by}`}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
          <p className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>
            Replay seed (designer only): <span className="font-mono break-all text-v7-text">{detail.seed}</span>
          </p>
          {phase === 'failed' ? <AdminStatus state={{ kind: 'error', message: BUILD_FAILED_COPY }} /> : null}
        </div>
      ) : null}
    </Dialog>
  );
}
