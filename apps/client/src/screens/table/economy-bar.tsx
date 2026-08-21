/**
 * Economy action bar — L12-06 / L30-02 / L43-02 / L43-05.
 * Draw + Shop. Stats only on a finished board (`readOnly`).
 */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { CostDisplay } from '../../design/components/cost-display';
import { DRAW_ACTION_LABEL, SHOP_ACTION_LABEL } from './chrome-labels';

export interface EconomyBarProps {
  isMyTurn: boolean;
  actionsLocked: boolean;
  drawValue: number;
  onDraw: () => void;
  onOpenShop: () => void;
  /** Finished board — reopen the stats dialog (PROTOCOL 24). */
  onShowStats?: () => void;
}

export function EconomyBar({
  isMyTurn,
  actionsLocked,
  drawValue,
  onDraw,
  onOpenShop,
  onShowStats,
}: EconomyBarProps): ReactElement {
  const disabled = !isMyTurn || actionsLocked;

  return (
    <section
      data-zone="economy-bar"
      className="flex flex-wrap items-center gap-1 rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised/80 p-1 sm:gap-2 sm:p-1.5"
    >
      <Button variant="yellow" disabled={disabled} onClick={onDraw}>
        {DRAW_ACTION_LABEL}{' '}
        <CostDisplay cost={{ kind: 'points', amount: drawValue }} className="text-inherit" />
      </Button>
      <Button variant="orange" onClick={onOpenShop}>
        {SHOP_ACTION_LABEL}
      </Button>
      {onShowStats !== undefined && (
        <Button type="button" variant="purple" onClick={onShowStats}>
          Stats
        </Button>
      )}
    </section>
  );
}
