/**
 * Absorber — rules spec §3. Immediate: gain lives the target lost last complete turn.
 * Upgraded also captures points/upgrade points actively spent (not theft).
 */

import {
  grantLives,
  grantPoints,
  grantUpgradePoints,
} from '../../engine/economy/grant-resources';
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
    grantLives(context.state, actor, ledger.livesLost, 'direct');

    if (context.card.isUpgraded) {
      grantPoints(context.state, actor, ledger.pointsSpent, 'direct');
      grantUpgradePoints(context.state, actor, ledger.upgradePointsSpent, 'direct');
    }
  },
};
