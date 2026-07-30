/**
 * Strong attack — rules spec §2. Cost 2 points, damage 2 (4 upgraded).
 */

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const strongAttackHandler: CardHandler = {
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
      cardId: 'strong-attack',
      isUpgraded: context.card.isUpgraded,
    });
  },
};
