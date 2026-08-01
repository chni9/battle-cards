/**
 * Felt-table layout shell — L12-01.
 * Opponents arc by seat count; action log is the center-stage band (main organ).
 * technical spec v2 §6 · backlog L12-01.
 */

import type { ReactElement, ReactNode } from 'react';

export interface TableShellProps {
  header: ReactNode;
  turn: ReactNode;
  prompts: ReactNode;
  /** Ordered opponent seats (1–3). Placement depends on length. */
  opponentSeats: ReactNode[];
  pending: ReactNode;
  actionLog: ReactNode;
  privateZone: ReactNode;
  economy: ReactNode;
  legacyActions?: ReactNode;
}

/**
 * Seat slots for 1–3 opponents:
 * - 1 (2p game): top-center
 * - 2 (3p): left + right
 * - 3 (4p): left + top + right
 */
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
      className="min-h-[100dvh] bg-surface font-sans text-ink"
      data-zone="table"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-4 md:px-6 md:py-5">
        <header data-zone="header" className="shrink-0">
          {header}
        </header>

        <div data-zone="turn" className="shrink-0">
          {turn}
        </div>

        {prompts}

        {/* Felt board */}
        <div
          data-zone="felt"
          className="grid gap-3 rounded-[length:var(--radius-card)] border border-border bg-slate p-3 text-cta-label-on-dark md:gap-4 md:p-4"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.2fr) minmax(0, 1fr)',
            gridTemplateRows: 'auto auto minmax(14rem, 1fr) auto',
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
            className="flex items-start justify-center"
            style={{ gridArea: 'opp-left' }}
          >
            {byArea.left ?? null}
          </div>
          <div
            data-zone="opponents-top"
            className="flex items-start justify-center"
            style={{ gridArea: 'opp-top' }}
          >
            {byArea.top ?? null}
          </div>
          <div
            data-zone="opponents-right"
            className="flex items-start justify-center"
            style={{ gridArea: 'opp-right' }}
          >
            {byArea.right ?? null}
          </div>

          <div
            data-zone="pending"
            className="min-h-0 rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-slate/80 p-2"
            style={{ gridArea: 'pending' }}
          >
            {pending}
          </div>

          <div
            data-zone="action-log"
            className="flex min-h-[14rem] flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised p-2 text-ink md:min-h-[18rem]"
            style={{ gridArea: 'log' }}
          >
            {actionLog}
          </div>

          <div
            data-zone="dock"
            className="flex flex-col gap-3 rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-surface-kit/90 p-3 text-ink"
            style={{ gridArea: 'dock' }}
          >
            <div data-zone="private">{privateZone}</div>
            <div data-zone="economy">{economy}</div>
            {legacyActions !== undefined && (
              <div data-zone="legacy-actions" className="border-t border-border-soft pt-3">
                {legacyActions}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
