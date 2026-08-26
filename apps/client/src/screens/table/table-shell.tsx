/**
 * Felt-table layout shell — full-bleed viewport, dock-first.
 * Portrait: opponents → pending → log → dock (vertical).
 * Landscape: left column (opponents + pending + log) | right dock.
 * Only the action log (and pending strips) scroll — never the page.
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface TableShellProps {
  /** Compact meta + turn strip (no separate Card Battle title). */
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
}

export function TableShell({
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
}: TableShellProps): ReactElement {
  return (
    <main
      className="table-shell flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-slate font-sans text-cta-label-on-dark"
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

        <div data-zone="felt" className="table-felt min-h-0 flex-1 overflow-hidden">
          <div
            data-zone="opponents"
            className={[
              'table-felt__opponents flex min-h-0 items-start justify-center gap-1 overflow-x-auto overflow-y-visible overscroll-contain py-1',
              opponentsClassName ?? '',
            ].join(' ')}
          >
            {opponentSeats}
          </div>

          <div
            data-zone="pending"
            className="table-felt__pending min-h-0 overflow-y-auto overscroll-contain rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-slate/80 px-2 py-1"
          >
            {pending}
          </div>

          <div
            data-zone="action-log"
            className={[
              'table-felt__log flex min-h-0 flex-col rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised p-1 text-ink sm:p-1.5',
              logClassName ?? 'overflow-hidden',
            ].join(' ')}
          >
            {actionLog}
          </div>

          <div
            data-zone="dock"
            className="table-felt__dock flex min-h-0 flex-col gap-1 overflow-visible rounded-[length:var(--radius-card)] border border-border-soft p-1.5 text-ink sm:p-2"
            style={dockStyle}
          >
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
          </div>
        </div>
      </div>
    </main>
  );
}
