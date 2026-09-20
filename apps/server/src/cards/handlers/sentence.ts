/**
 * Sentence — rules spec §5, backlog L5-07 / L63-03.
 *
 * Starts a public 3-owner-turn countdown (activation counts). Fire is a seeded
 * pick that queues elimination on the victim's turn. Upgraded excludes the user.
 * Invisible players are excluded; empty pool → canPlay false / fire fizzle.
 * Remaining turns are not card-lives. Not deactivatePersistent.
 */

import { sentenceCandidates, startPendingSentence } from '../../engine/turn/pending-sentences';
import type { CardHandler } from '../handler';

export const sentenceHandler: CardHandler = {
  canPlay(context): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    return (
      sentenceCandidates(context.state, context.sourcePlayerId, context.card.isUpgraded)
        .length > 0
    );
  },

  play(context): void {
    const { state, sourcePlayerId, card } = context;
    const candidates = sentenceCandidates(state, sourcePlayerId, card.isUpgraded);

    if (candidates.length === 0) {
      return;
    }

    startPendingSentence(state, sourcePlayerId, card.isUpgraded);
  },
};
