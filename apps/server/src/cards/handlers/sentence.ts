/**
 * Sentence — rules spec §5, backlog L5-07 / L25-02 #V4-9c.
 *
 * Seeded draw among alive players at play time; queues elimination on the victim.
 * Upgraded excludes the user from the draw. Self-elim: no eliminator reward.
 * Invisible players are excluded from the candidate pool; empty pool → canPlay false
 * (Mirror empty-target precedent).
 */

import type { GameState, Player } from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import { playerIsInvisible } from '../../engine/specials/is-invisible';
import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function sentenceCandidates(
  state: GameState,
  sourcePlayerId: string,
  isUpgraded: boolean,
): Player[] {
  return state.players.filter((player) => {
    if (player.isEliminated) {
      return false;
    }

    if (playerIsInvisible(player)) {
      return false;
    }

    if (isUpgraded && player.id === sourcePlayerId) {
      return false;
    }

    return true;
  });
}

export const sentenceHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    return (
      sentenceCandidates(context.state, context.sourcePlayerId, context.card.isUpgraded)
        .length > 0
    );
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card } = context;
    const candidates = sentenceCandidates(state, sourcePlayerId, card.isUpgraded);

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
