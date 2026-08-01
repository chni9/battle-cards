/**
 * Economy action bar — L12-01 shell; L12-06 restyles Buy entry.
 * Draw / UP buy-sell / Leave; Buy opens dialog in L12-08.
 */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';

export interface EconomyBarProps {
  isMyTurn: boolean;
  actionsLocked: boolean;
  drawValue: number;
  upgradePoints: number;
  onDraw: () => void;
  onBuyUpgradePoint: () => void;
  onSellUpgradePoint: () => void;
  onOpenBuy: () => void;
  onLeave: () => void;
}

export function EconomyBar({
  isMyTurn,
  actionsLocked,
  drawValue,
  upgradePoints,
  onDraw,
  onBuyUpgradePoint,
  onSellUpgradePoint,
  onOpenBuy,
  onLeave,
}: EconomyBarProps): ReactElement {
  const disabled = !isMyTurn || actionsLocked;

  return (
    <section data-zone="economy-bar" className="flex flex-wrap items-center gap-2">
      <Button variant="yellow" disabled={disabled} onClick={onDraw}>
        Draw (+{drawValue} point{drawValue === 1 ? '' : 's'})
      </Button>
      <Button variant="orange" disabled={disabled} onClick={onBuyUpgradePoint}>
        Buy upgrade point
      </Button>
      <Button
        variant="orange"
        disabled={disabled || upgradePoints < 1}
        onClick={onSellUpgradePoint}
      >
        Sell upgrade point
      </Button>
      <Button variant="orange" disabled={disabled} onClick={onOpenBuy}>
        Buy
      </Button>
      <Button variant="red" onClick={onLeave}>
        Leave
      </Button>
    </section>
  );
}
