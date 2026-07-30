/**
 * Thief — rules spec §3. Queues; steals up to 10 points on the target's turn.
 * Upgraded: target loses the capped amount; user gains double.
 */

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const thiefHandler: CardHandler = {
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
      cardId: 'thief',
      isUpgraded: context.card.isUpgraded,
    });
  },
};
