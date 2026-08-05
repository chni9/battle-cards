/**
 * Card Absorber — rules spec §5, backlog L24-01 / #V4-14 / #V4-15.
 *
 * Strictly personal: recovers from the shared pool. Base draws up to 4 at random;
 * upgraded raises a `pool-pick` for up to 8 chosen cards (designer 2026-08-05).
 */

import {
  beginPoolPick,
  CARD_ABSORBER_BASE_MAX,
  pickRandomPoolInstanceIds,
  recoverCardsFromPool,
} from '../../engine/turn/generic-sub-choice';
import type { CardHandler, EffectContext } from '../handler';

export const cardAbsorberHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null && context.state.pool.length >= 1;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card, rng, nowMs } = context;

    if (card.isUpgraded) {
      beginPoolPick(state, {
        playerId: sourcePlayerId,
        cardIsUpgraded: true,
        nowMs,
      });
      return;
    }

    const eligible = state.pool.map((entry) => entry.instanceId);
    const picked = pickRandomPoolInstanceIds(
      eligible,
      Math.min(CARD_ABSORBER_BASE_MAX, eligible.length),
      rng,
    );
    recoverCardsFromPool(state, sourcePlayerId, picked);
  },
};
