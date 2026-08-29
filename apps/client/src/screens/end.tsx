/**
 * Finished phase — closable stats over the frozen board (designer 2026-08-06).
 * Game over Dialog opens after the L51-06 win/death banner (~1.6s).
 * PROTOCOL_VERSION 24 · `FinishedStateView.finalTable`.
 */

import type { FinishedStateView } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import type { ActionRejectPayload } from '../net/use-room-connection';
import { GameOverDialog } from './game-over-dialog';
import { TableScreen } from './table';
import { TABLE_BANNER_MS } from './table/table-banner';

export interface EndScreenProps {
  view: FinishedStateView;
  actionReject: ActionRejectPayload | null;
  onDismissActionReject: () => void;
  statusLabel: string;
  nowMs: number;
  onLeave: () => void;
}

const noop = (): void => {
  /* finished board is inspect-only */
};

export function EndScreen({
  view,
  actionReject,
  onDismissActionReject,
  statusLabel,
  nowMs,
  onLeave,
}: EndScreenProps): ReactElement {
  const [statsOpen, setStatsOpen] = useState(false);
  const youWon = view.winnerPlayerId === view.finalTable.you;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setStatsOpen(true);
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  return (
    <>
      <TableScreen
        view={view.finalTable}
        actionReject={actionReject}
        onDismissActionReject={onDismissActionReject}
        statusLabel={statusLabel}
        nowMs={nowMs}
        deadlineMs={null}
        lastActionResolved={null}
        subChoice={null}
        readOnly
        youWon={youWon}
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
        onForfeit={noop}
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
