/**
 * Felt-table layout shell — full-bleed viewport, dock-first.
 * Portrait: opponents → pending → log → dock (vertical).
 * Landscape: left column (opponents + pending + log) | right dock.
 * Only the action log (and pending strips) scroll — never the page.
 */

import type { ReactElement, ReactNode } from 'react';

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
}: TableShellProps): ReactElement {
  return (
    <main
      className="table-shell flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-slate font-sans text-cta-label-on-dark"
      data-zone="table"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 p-1 sm:p-1.5">
        <div
          data-zone="turn"
          className="shrink-0 rounded-[length:var(--radius-card)] bg-surface text-ink"
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
            className="table-felt__opponents flex min-h-0 items-start justify-center gap-1 overflow-x-auto overflow-y-hidden overscroll-contain"
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
            className="table-felt__log flex min-h-0 flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised p-1 text-ink sm:p-1.5"
          >
            {actionLog}
          </div>

          <div
            data-zone="dock"
            className="table-felt__dock flex min-h-0 flex-col gap-1 overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-surface-kit p-1.5 text-ink sm:p-2"
          >
            <div data-zone="private" className="min-h-0 flex-1 overflow-hidden">
              {privateZone}
            </div>
            <div data-zone="economy" className="shrink-0">
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
