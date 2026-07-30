/**
 * Spy — rules spec §3. Queues; on resolve grants persistent visibility of the target.
 */

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const spyHandler: CardHandler = {
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
      cardId: 'spy',
      isUpgraded: context.card.isUpgraded,
    });
  },
};
