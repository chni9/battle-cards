/**
 * Super attack — rules spec §2. Cost 10 points, damage 7 (10 upgraded).
 */

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const superAttackHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId !== null;
  },

  play(context: EffectContext): void {
    const targetPlayerId = context.targetPlayerId;

    if (targetPlayerId === null) {
      return;
    }

    queueEffect({
      state: context.state,
      sourcePlayerId: context.sourcePlayerId,
      targetPlayerId,
      cardId: 'super-attack',
      isUpgraded: context.card.isUpgraded,
    });
  },
};
