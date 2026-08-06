/**
 * Finished phase — closable stats over the frozen board (designer 2026-08-06).
 * Stats dialog defaults open; Esc / overlay / View board dismiss so players can
 * inspect the final table. PROTOCOL_VERSION 24 · `FinishedStateView.finalTable`.
 */

import type { FinishedStateView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { GameOverDialog } from './game-over-dialog';
import { TableScreen } from './table';

export interface EndScreenProps {
  view: FinishedStateView;
  error: string | null;
  statusLabel: string;
  nowMs: number;
  onLeave: () => void;
}

const noop = (): void => {
  /* finished board is inspect-only */
};

export function EndScreen({
  view,
  error,
  statusLabel,
  nowMs,
  onLeave,
}: EndScreenProps): ReactElement {
  const [statsOpen, setStatsOpen] = useState(true);

  return (
    <>
      <TableScreen
        view={view.finalTable}
        error={error}
        statusLabel={statusLabel}
        nowMs={nowMs}
        deadlineMs={null}
        lastActionResolved={null}
        subChoice={null}
        readOnly
        onShowStats={() => {
          setStatsOpen(true);
        }}
        onDraw={noop}
        onPlayCard={noop}
        onPlayMultipleAttacks={noop}
        onResolveSubChoice={noop}
        onBuyCard={noop}
        onSellCard={noop}
        onUpgradeCard={noop}
        onBuyUpgradePoint={noop}
        onBuySpecialCard={noop}
        onSellUpgradePoint={noop}
        onLeave={onLeave}
      />
      <GameOverDialog
        open={statsOpen}
        view={view}
        onClose={() => {
          setStatsOpen(false);
        }}
        onLeave={onLeave}
      />
    </>
  );
}
