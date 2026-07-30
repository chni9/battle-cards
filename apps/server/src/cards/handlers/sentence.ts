/**
 * Sentence — rules spec §5, backlog L5-07.
 *
 * Seeded draw among alive players at play time; queues elimination on the victim.
 * Upgraded excludes the user from the draw. Self-elim: no eliminator reward.
 */

import { createRng } from '../../engine/rng';
import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

export const sentenceHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card } = context;
    const candidates = state.players.filter((player) => {
      if (player.isEliminated) {
        return false;
      }

      if (card.isUpgraded && player.id === sourcePlayerId) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return;
    }

    const rng = createRng(state.seed);
    // Advance RNG by turnSequence so successive Sentences in one game diverge.
    for (let i = 0; i < state.turnSequence; i += 1) {
      rng.nextInt(1);
    }

    const victim = rng.pick(candidates);

    queueEffect({
      state,
      sourcePlayerId,
      targetPlayerId: victim.id,
      cardId: 'sentence',
      isUpgraded: card.isUpgraded,
    });
  },
};
