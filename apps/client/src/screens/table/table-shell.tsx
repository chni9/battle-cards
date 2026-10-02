/**
 * Felt-table layout shell — full-bleed viewport, dock-first.
 * Cardthago DA mock: Atelier and Fresque each use their own grid (not token recolor).
 */

import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react';

import type { CardthagoSkin } from '../../design/cardthago-skin';
import { Button } from '../../design/components/button';
import {
  ACTION_LOG_OPEN_LABEL,
  OPPONENTS_OPEN_LABEL,
} from './table-copy';
import type { FeltCollapse } from './felt-collapse';

export interface TableShellProps {
  skin: CardthagoSkin;
  /** Compact meta + turn strip (no separate Cardthago title). */
  turn: ReactNode;
  prompts: ReactNode;
  opponentSeats: ReactNode[];
  pending: ReactNode;
  actionLog: ReactNode;
  privateZone: ReactNode;
  economy: ReactNode;
  legacyActions?: ReactNode;
  /** POV seat wash on the dock (replaces fixed surface-kit pink). */
  dockStyle?: CSSProperties;
  turnClassName?: string;
  opponentsClassName?: string;
  logClassName?: string;
  feltRef?: Ref<HTMLDivElement>;
  collapse?: FeltCollapse;
  waitingCount?: number;
  onOpenLog?: () => void;
  onOpenOpponents?: () => void;
}

function splitColonnadeSeats(seats: ReactNode[]): {
  left: ReactNode[];
  right: ReactNode[];
} {
  const mid = Math.ceil(seats.length / 2);
  return {
    left: seats.slice(0, mid),
    right: seats.slice(mid),
  };
}

export function TableShell({
  skin,
  turn,
  prompts,
  opponentSeats,
  pending,
  actionLog,
  privateZone,
  economy,
  legacyActions,
  dockStyle,
  turnClassName,
  opponentsClassName,
  logClassName,
  feltRef,
  collapse = { incoming: false, actionLog: false, opponents: false },
  waitingCount = 0,
  onOpenLog,
  onOpenOpponents,
}: TableShellProps): ReactElement {
  const pendingEmpty = waitingCount === 0;
  const hidePending = collapse.incoming || pendingEmpty;

  const opponentsCollapsed = collapse.opponents;
  const logCollapsed = collapse.actionLog;

  const colonnades = splitColonnadeSeats(opponentSeats);

  const opponentsRow = opponentsCollapsed ? (
    <Button
      compact
      type="button"
      variant="orange"
      className="w-full min-w-0 max-w-full"
      data-zone="opponents-collapsed"
      onClick={() => {
        onOpenOpponents?.();
      }}
    >
      {OPPONENTS_OPEN_LABEL} ({String(opponentSeats.length)})
    </Button>
  ) : (
    opponentSeats
  );

  const logPanel = logCollapsed ? (
    <Button
      compact
      type="button"
      variant="orange"
      className="w-full min-w-0 max-w-full"
      data-zone="log-collapsed"
      onClick={() => {
        onOpenLog?.();
      }}
    >
      {ACTION_LOG_OPEN_LABEL}
    </Button>
  ) : (
    actionLog
  );

  const dockInner = (
    <>
      <div data-zone="private" className="min-h-0 flex-1 overflow-visible">
        {privateZone}
      </div>
      <div data-zone="economy" className="relative z-[4] shrink-0 overflow-visible">
        {economy}
      </div>
      {legacyActions !== undefined && (
        <div data-zone="legacy-actions" className="border-t border-border-soft pt-2">
          {legacyActions}
        </div>
      )}
    </>
  );

  return (
    <main
      className="table-shell flex h-full max-h-full w-full min-w-0 flex-col overflow-hidden font-sans text-cta-label-on-dark"
      data-zone="table"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 p-1 sm:p-1.5">
        <div
          data-zone="turn"
          className={[
            'shrink-0 overflow-visible rounded-[length:var(--radius-card)] bg-surface text-ink',
            turnClassName ?? '',
          ].join(' ')}
        >
          {turn}
        </div>

        {prompts !== null && prompts !== false && prompts !== undefined ? (
          <div className="shrink-0 rounded-[length:var(--radius-card)] bg-surface text-ink">
            {prompts}
          </div>
        ) : null}

        {skin === 'fresque' ? (
          <div
            ref={feltRef}
            data-zone="felt"
            className="table-felt table-felt--fresque min-h-0 flex-1 overflow-hidden"
            data-collapse-incoming={collapse.incoming ? 'true' : 'false'}
            data-collapse-log={collapse.actionLog ? 'true' : 'false'}
            data-collapse-opponents={collapse.opponents ? 'true' : 'false'}
          >
            <div
              data-zone="opponents"
              data-opponent-count={String(opponentSeats.length)}
              className={[
                'table-felt__bust-ring flex min-h-0 flex-nowrap',
                opponentsClassName ?? '',
              ].join(' ')}
            >
              {opponentsRow}
            </div>

            <div
              className="table-felt__colonnade table-felt__colonnade--left flex min-h-0 flex-nowrap"
              data-zone="colonnade-left"
            >
              {opponentsCollapsed ? opponentsRow : colonnades.left}
            </div>

            <div className="table-felt__mosaic min-h-0 overflow-hidden">
              <div
                data-zone="pending"
                data-empty={hidePending ? 'true' : 'false'}
                className="table-felt__mosaic-pending min-h-0 overflow-y-auto overscroll-contain"
              >
                {hidePending ? null : pending}
              </div>
            </div>

            <div
              className="table-felt__colonnade table-felt__colonnade--right flex min-h-0 flex-nowrap"
              data-zone="colonnade-right"
            >
              {opponentsCollapsed ? null : colonnades.right}
            </div>

            <div
              data-zone="action-log"
              className={[
                'table-felt__log table-felt__log--papyrus flex min-h-0 flex-col p-1 sm:p-1.5',
                collapse.actionLog ? 'overflow-visible' : (logClassName ?? 'overflow-hidden'),
              ].join(' ')}
            >
              {logPanel}
            </div>

            <div
              data-zone="dock"
              className="table-felt__dock table-felt__dock--near flex min-h-0 flex-col gap-1 overflow-visible p-1.5 sm:p-2"
              style={dockStyle}
            >
              {dockInner}
            </div>
          </div>
        ) : (
          <div
            ref={feltRef}
            data-zone="felt"
            className="table-felt table-felt--atelier min-h-0 flex-1 overflow-hidden"
            data-collapse-incoming={collapse.incoming ? 'true' : 'false'}
            data-collapse-log={collapse.actionLog ? 'true' : 'false'}
            data-collapse-opponents={collapse.opponents ? 'true' : 'false'}
          >
            <div
              data-zone="opponents"
              data-opponent-count={String(opponentSeats.length)}
              className={[
                'table-felt__opponents table-felt__opponents--arc flex min-h-0 flex-nowrap',
                collapse.opponents
                  ? 'items-center justify-center overflow-visible py-1'
                  : 'items-start justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 touch-pan-x',
                opponentsClassName ?? '',
              ].join(' ')}
            >
              {opponentsRow}
            </div>

            <div
              data-zone="pending"
              data-empty={hidePending ? 'true' : 'false'}
              className="table-felt__court min-h-0 overflow-y-auto overscroll-contain rounded-[length:var(--radius-card)] px-2 py-1"
            >
              {hidePending ? null : pending}
            </div>

            <div
              data-zone="action-log"
              className={[
                'table-felt__log table-felt__log--stele flex min-h-0 flex-col p-1 sm:p-1.5',
                collapse.actionLog ? 'overflow-visible' : (logClassName ?? 'overflow-hidden'),
              ].join(' ')}
            >
              {logPanel}
            </div>

            <div
              data-zone="dock"
              className="table-felt__dock table-felt__dock--slab flex min-h-0 flex-col gap-1 overflow-visible p-1.5 text-ink sm:p-2"
              style={dockStyle}
            >
              {dockInner}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
