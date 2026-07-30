/**
 * Regeneration — rules spec §3, §7. Buy up to 4 lives at 3 points each (2 upgraded).
 * Strictly personal. Excess over GameState.lifeLimit is lost.
 */

import { gainLives } from '../../engine/life/gain-lives';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

const MAX_LIVES_PER_USE = 4;
const POINTS_PER_LIFE_BASE = 3;
const POINTS_PER_LIFE_UPGRADED = 2;

function pointsPerLife(isUpgraded: boolean): number {
  return isUpgraded ? POINTS_PER_LIFE_UPGRADED : POINTS_PER_LIFE_BASE;
}

export const regenerationHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const quantity = context.quantity;

    if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LIVES_PER_USE) {
      return false;
    }

    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return false;
    }

    const cost = quantity * pointsPerLife(context.card.isUpgraded);
    return actor.points >= cost;
  },

  play(context: EffectContext): void {
    const quantity = context.quantity;
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined || quantity === null) {
      return;
    }

    const cost = quantity * pointsPerLife(context.card.isUpgraded);
    actor.points -= cost;
    actor.turnLedger.pointsSpent += cost;
    gainLives(actor, quantity, context.state.lifeLimit);
  },
};
