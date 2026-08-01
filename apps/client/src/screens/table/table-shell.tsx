/**
 * Felt-table layout shell — full-bleed viewport, dock-first.
 * Only the action log scrolls; opponents hug content.
 */

import type { ReactElement, ReactNode } from 'react';

export interface TableShellProps {
  header: ReactNode;
  turn: ReactNode;
  prompts: ReactNode;
  opponentSeats: ReactNode[];
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
      className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-slate font-sans text-cta-label-on-dark"
      data-zone="table"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 p-1 sm:p-1.5 md:p-2">
        <header
          data-zone="header"
          className="shrink-0 rounded-[length:var(--radius-card)] bg-surface px-3 py-1.5 text-ink"
        >
          {header}
        </header>

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

        <div
          data-zone="felt"
          className="grid min-h-0 flex-1 gap-1 overflow-hidden md:gap-1.5"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)',
            gridTemplateRows: 'auto auto minmax(3rem, 14vh) minmax(0, 1fr)',
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
            className="flex min-h-0 max-h-[16vh] items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-left' }}
          >
            {byArea.left ?? null}
          </div>
          <div
            data-zone="opponents-top"
            className="flex min-h-0 max-h-[16vh] items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-top' }}
          >
            {byArea.top ?? null}
          </div>
          <div
            data-zone="opponents-right"
            className="flex min-h-0 max-h-[16vh] items-start justify-center overflow-hidden"
            style={{ gridArea: 'opp-right' }}
          >
            {byArea.right ?? null}
          </div>

          <div
            data-zone="pending"
            className="min-h-0 max-h-[2.5rem] overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-slate/80 px-2 py-0.5"
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
            className="flex min-h-0 flex-col gap-1 overflow-hidden rounded-[length:var(--radius-card)] border border-slate-soft/40 bg-surface-kit p-2 text-ink"
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
