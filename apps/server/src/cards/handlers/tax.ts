/**
 * Tax — rules spec §3. Costs 1 life via applyLifeLoss; gains 4 points (6 upgraded).
 * Strictly personal: no target. Shield never absorbs the life cost.
 */

import { grantPoints } from '../../engine/economy/grant-resources';
import { creditGhostLifeLoss } from '../../engine/kits/credit-ghost-life-loss';
import { applyLifeLoss } from '../../engine/life/apply-life-loss';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

const TAX_POINTS_BASE = 4;
const TAX_POINTS_UPGRADED = 6;

export const taxHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null;
  },

  play(context: EffectContext): void {
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const outcome = applyLifeLoss(actor, 1, 'tax');
    actor.turnLedger.livesLost += outcome.livesLost;
    creditGhostLifeLoss(context.state, actor, outcome.livesLost);
    grantPoints(
      context.state,
      actor,
      context.card.isUpgraded ? TAX_POINTS_UPGRADED : TAX_POINTS_BASE,
      'direct',
    );
  },
};
