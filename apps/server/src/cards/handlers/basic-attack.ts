/**
 * Basic attack — rules spec §2. Cost 1 point, damage 1 (3 upgraded).
 * Queues on the target; engine resolves via applyDamage on the target's turn.
 */

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const basicAttackHandler: CardHandler = {
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
      cardId: 'basic-attack',
      isUpgraded: context.card.isUpgraded,
    });
  },
};
