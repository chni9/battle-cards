/**
 * Economy action bar — L12-06 / L30-02.
 * Draw / buy-sell UP / Buy / Pool (Dialog entry) / Leave.
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
  onLeave: () => void;
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
  onLeave,
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
      <span className="mx-1 hidden h-6 w-px bg-border-soft sm:inline-block" aria-hidden />
      <Button variant="red" onClick={onLeave}>
        Leave
      </Button>
    </section>
  );
}
