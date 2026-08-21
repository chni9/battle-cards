/**
 * Economy action bar — L12-06 / L30-02 / L42-03 / L43-02.
 * Draw + Shop. How to play + Leave stay until L43-05.
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
  onDraw,
  onOpenShop,
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
        {DRAW_ACTION_LABEL}{' '}
        <CostDisplay cost={{ kind: 'points', amount: drawValue }} className="text-inherit" />
      </Button>
      <Button variant="orange" onClick={onOpenShop}>
        {SHOP_ACTION_LABEL}
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
