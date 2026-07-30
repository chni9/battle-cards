/**
 * Absorber — rules spec §3. Immediate: gain lives the target lost last complete turn.
 * Upgraded also captures points/upgrade points actively spent (not theft).
 */

import { gainLives } from '../../engine/life/gain-lives';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

export const absorberHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId !== null;
  },

  play(context: EffectContext): void {
    const targetPlayerId = context.targetPlayerId;
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (targetPlayerId === null || actor === undefined) {
      return;
    }

    const target = findPlayer(context.state, targetPlayerId);

    if (target === undefined) {
      return;
    }

    const ledger = target.turnLedger;
    gainLives(actor, ledger.livesLost, context.state.lifeLimit);

    if (context.card.isUpgraded) {
      actor.points += ledger.pointsSpent;
      actor.upgradePoints += ledger.upgradePointsSpent;
    }
  },
};
