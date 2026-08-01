/**
 * Felt-table layout shell — viewport-locked (no page scroll).
 * Opponents arc; center-stage action log; private dock bottom.
 */

import type { ReactElement, ReactNode } from 'react';

export interface TableShellProps {
  header: ReactNode;
  turn: ReactNode;
  prompts: ReactNode;
  /** Ordered opponent seats (1–3). Placement depends on length. */
  opponentSeats: ReactNode[];
  /** Pending effects aimed at others (not the local player). */
  pending: ReactNode;
  actionLog: ReactNode;
  privateZone: ReactNode;
  economy: ReactNode;
  legacyActions?: ReactNode;
}

function seatAreas(count: number): readonly ('left' | 'top' | 'right')[] {
  if (count <= 1) {
    return ['top'];
  }
  if (count === 2) {
    return ['left', 'right'];
  }
  return ['left', 'top', 'right'];
}

export function TableShell({
  header,
  turn,
  prompts,
  opponentSeats,
  pending,
  actionLog,
  privateZone,
  economy,
  legacyActions,
}: TableShellProps): ReactElement {
  const areas = seatAreas(opponentSeats.length);
  const byArea: Partial<Record<'left' | 'top' | 'right', ReactNode>> = {};
  for (let i = 0; i < opponentSeats.length; i++) {
    const area = areas[i];
    const seat = opponentSeats[i];
    if (area !== undefined && seat !== undefined) {
      byArea[area] = seat;
    }
  }

  return (
    <main
      className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-surface font-sans text-ink"
      data-zone="table"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-1.5 px-2 py-2 md:gap-2 md:px-4 md:py-3">
        <header data-zone="header" className="shrink-0">
          {header}
        </header>

        <div data-zone="turn" className="shrink-0">
          {turn}
        </div>

        {prompts !== null && prompts !== false && prompts !== undefined ? (
          <div className="shrink-0">{prompts}</div>
        ) : null}

        <div
          data-zone="felt"
          className="grid min-h-0 flex-1 gap-1.5 overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-slate p-1.5 text-cta-label-on-dark md:gap-2 md:p-2"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.2fr) minmax(0, 1fr)',
            gridTemplateRows: 'auto auto minmax(0, 1fr) minmax(12rem, 42dvh)',
            gridTemplateAreas: `
              "opp-left opp-top opp-right"
              "pending pending pending"
              "log log log"
              "dock dock dock"
            `,
          }}
        >
          <div
            data-zone="opponents-left"
            className="flex min-h-0 items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-left' }}
          >
            {byArea.left ?? null}
          </div>
          <div
            data-zone="opponents-top"
            className="flex min-h-0 items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-top' }}
          >
            {byArea.top ?? null}
          </div>
          <div
            data-zone="opponents-right"
            className="flex min-h-0 items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-right' }}
          >
            {byArea.right ?? null}
          </div>

          <div
            data-zone="pending"
            className="min-h-0 max-h-[4.5rem] overflow-y-auto rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-slate/80 px-2 py-1"
            style={{ gridArea: 'pending' }}
          >
            {pending}
          </div>

          <div
            data-zone="action-log"
            className="flex min-h-0 flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised p-1.5 text-ink"
            style={{ gridArea: 'log' }}
          >
            {actionLog}
          </div>

          <div
            data-zone="dock"
            className="flex min-h-0 flex-col gap-1.5 overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-surface-kit/90 p-2 text-ink"
            style={{ gridArea: 'dock' }}
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
