/**
 * Economy action bar — L12-06 / L30-02 / L43-02 / L43-05 / L58-07.
 * Draw + Shop + Unspy. Stats only on a finished board (`readOnly`).
 * Draw is green so the point icon is not yellow-on-yellow.
 */

import { CLEAR_SPY_COST } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { CostDisplay } from '../../design/components/cost-display';
import {
  DRAW_ACTION_LABEL,
  SHOP_ACTION_LABEL,
  UNSPY_ACTION_LABEL,
} from './chrome-labels';
import { SpyEyeIcon } from './spy-eye-icon';
import { TutorialCallout } from './tutorial-callout';

export interface EconomyBarProps {
  isMyTurn: boolean;
  actionsLocked: boolean;
  drawValue: number;
  onDraw: () => void;
  onOpenShop: () => void;
  /** Living opponent currently spying the recipient (public `spyingOnYou`). */
  hasLivingSpy: boolean;
  canAffordUnspy: boolean;
  onOpenUnspy: () => void;
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
  hasLivingSpy,
  canAffordUnspy,
  onOpenUnspy,
  onShowStats,
  spotlight,
}: EconomyBarProps): ReactElement {
  const disabled = !isMyTurn || actionsLocked;
  const unspyDisabled = disabled || !hasLivingSpy || !canAffordUnspy;

  return (
    <section
      data-zone="economy-bar"
      className={[
        'flex flex-wrap items-center gap-1 overflow-visible rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised/80 sm:gap-2',
        spotlight !== undefined ? 'px-2 pb-2 pt-9 sm:px-2.5 sm:pb-2.5 sm:pt-10' : 'p-1 sm:p-1.5',
      ].join(' ')}
    >
      <TutorialCallout
        active={spotlight === 'draw'}
        arrow="top"
        highlightId="draw"
      >
        <Button
          variant="green"
          disabled={disabled}
          onClick={onDraw}
          data-hint-anchor="draw"
        >
          {DRAW_ACTION_LABEL}{' '}
          <CostDisplay
            cost={{ kind: 'points', amount: drawValue }}
            signed="gain"
            className="text-inherit"
          />
        </Button>
      </TutorialCallout>
      <TutorialCallout
        active={spotlight === 'shop'}
        arrow="top"
        highlightId="shop"
      >
        <Button variant="orange" onClick={onOpenShop} data-hint-anchor="shop">
          {SHOP_ACTION_LABEL}
        </Button>
      </TutorialCallout>
      <Button
        variant="purple"
        disabled={unspyDisabled}
        onClick={onOpenUnspy}
        data-unspy=""
      >
        <SpyEyeIcon variant="crossed" size={14} className="text-inherit" />
        {UNSPY_ACTION_LABEL}{' '}
        <CostDisplay
          cost={{ kind: 'points', amount: CLEAR_SPY_COST }}
          signed="cost"
          className="text-inherit"
        />
      </Button>
      {onShowStats !== undefined && (
        <Button type="button" variant="purple" onClick={onShowStats}>
          Stats
        </Button>
      )}
    </section>
  );
}
