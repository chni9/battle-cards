/**
 * Economy action bar — L12-06 / L30-02 / L43-02 / L43-05.
 * Draw + Shop. Stats only on a finished board (`readOnly`).
 * Draw is green so the point icon is not yellow-on-yellow.
 */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { CostDisplay } from '../../design/components/cost-display';
import { DRAW_ACTION_LABEL, SHOP_ACTION_LABEL } from './chrome-labels';
import { TUTORIAL_SPOTLIGHT_CLASS } from './tutorial-spotlight';

export interface EconomyBarProps {
  isMyTurn: boolean;
  actionsLocked: boolean;
  drawValue: number;
  onDraw: () => void;
  onOpenShop: () => void;
  /** Finished board — reopen the stats dialog (PROTOCOL 24). */
  onShowStats?: () => void;
  /** Tutorial spotlight (L45-05) — presentation only. */
  spotlight?: 'draw' | 'shop';
}

export function EconomyBar({
  isMyTurn,
  actionsLocked,
  drawValue,
  onDraw,
  onOpenShop,
  onShowStats,
  spotlight,
}: EconomyBarProps): ReactElement {
  const disabled = !isMyTurn || actionsLocked;

  return (
    <section
      data-zone="economy-bar"
      className="flex flex-wrap items-center gap-1 rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised/80 p-1 sm:gap-2 sm:p-1.5"
    >
      <Button
        variant="green"
        disabled={disabled}
        onClick={onDraw}
        className={spotlight === 'draw' ? TUTORIAL_SPOTLIGHT_CLASS : ''}
        {...(spotlight === 'draw' ? { 'data-tutorial-highlight': 'draw' } : {})}
      >
        {DRAW_ACTION_LABEL}{' '}
        <CostDisplay
          cost={{ kind: 'points', amount: drawValue }}
          signed="gain"
          className="text-inherit"
        />
      </Button>
      <Button
        variant="orange"
        onClick={onOpenShop}
        className={spotlight === 'shop' ? TUTORIAL_SPOTLIGHT_CLASS : ''}
        {...(spotlight === 'shop' ? { 'data-tutorial-highlight': 'shop' } : {})}
      >
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
