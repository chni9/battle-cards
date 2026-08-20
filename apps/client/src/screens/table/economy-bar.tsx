/**
 * Economy action bar — L12-06 / L30-02 / L42-03.
 * Draw / buy-sell UP / Buy / Pool / How to play / Leave.
 */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';

export interface EconomyBarProps {
  isMyTurn: boolean;
  actionsLocked: boolean;
  drawValue: number;
  upgradePoints: number;
  /** Shared pool size — always readable (rules spec §1 / L30-02). */
  poolCount: number;
  onDraw: () => void;
  onBuyUpgradePoint: () => void;
  onSellUpgradePoint: () => void;
  onOpenBuy: () => void;
  onOpenPool: () => void;
  onOpenHowToPlay: () => void;
  onLeave: () => void;
  /** Finished board — reopen the stats dialog (PROTOCOL 24). */
  onShowStats?: () => void;
  /** Finished board — Leave becomes Return home. */
  leaveLabel?: string;
}

export function EconomyBar({
  isMyTurn,
  actionsLocked,
  drawValue,
  upgradePoints,
  poolCount,
  onDraw,
  onBuyUpgradePoint,
  onSellUpgradePoint,
  onOpenBuy,
  onOpenPool,
  onOpenHowToPlay,
  onLeave,
  onShowStats,
  leaveLabel = 'Leave',
}: EconomyBarProps): ReactElement {
  const disabled = !isMyTurn || actionsLocked;

  return (
    <section
      data-zone="economy-bar"
      className="flex flex-wrap items-center gap-1 rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised/80 p-1 sm:gap-2 sm:p-1.5"
    >
      <Button variant="yellow" disabled={disabled} onClick={onDraw}>
        Draw (+{drawValue})
      </Button>
      <Button variant="orange" disabled={disabled} onClick={onBuyUpgradePoint}>
        Buy UP
      </Button>
      <Button
        variant="orange"
        disabled={disabled || upgradePoints < 1}
        onClick={onSellUpgradePoint}
      >
        Sell UP
      </Button>
      <Button variant="orange" disabled={disabled} onClick={onOpenBuy}>
        Buy
      </Button>
      <Button variant="green" onClick={onOpenPool}>
        Pool ({poolCount})
      </Button>
      <Button type="button" variant="orange" onClick={onOpenHowToPlay}>
        How to play
      </Button>
      <span className="mx-1 hidden h-6 w-px bg-border-soft sm:inline-block" aria-hidden />
      {onShowStats !== undefined && (
        <Button type="button" variant="purple" onClick={onShowStats}>
          Stats
        </Button>
      )}
      <Button variant="red" onClick={onLeave}>
        {leaveLabel}
      </Button>
    </section>
  );
}
