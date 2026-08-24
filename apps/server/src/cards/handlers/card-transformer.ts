/**
 * Card Transformer — rules spec §5, backlog L24-02 / #V4-16.
 *
 * Turns an owned shared action/attack (hand) into a special. Base draws at random;
 * upgraded raises `special-pick` on `GameState.subChoice`. Consumed card → pool;
 * result does not inherit upgrade.
 */

import { SHARED_CARD_IDS, TRANSFORM_RESULT_SPECIAL_IDS, type CardId } from '@card-battle/shared';

import {
  beginSpecialPick,
  grantTransformedSpecial,
} from '../../engine/turn/generic-sub-choice';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

const SHARED_SET = new Set<string>(SHARED_CARD_IDS);

export function isTransformableHandCardId(cardId: CardId): boolean {
  return SHARED_SET.has(cardId);
}

export const cardTransformerHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const { consumeInstanceId, state, sourcePlayerId } = context;

    if (consumeInstanceId === null) {
      return false;
    }

    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return false;
    }

    const consumed = actor.hand.find((card) => card.instanceId === consumeInstanceId);
    return consumed !== undefined && isTransformableHandCardId(consumed.cardId);
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card, consumeInstanceId, rng, nowMs } = context;

    if (consumeInstanceId === null) {
      return;
    }

    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const index = actor.hand.findIndex((entry) => entry.instanceId === consumeInstanceId);
    const consumed = index >= 0 ? actor.hand[index] : undefined;

    if (consumed === undefined || !isTransformableHandCardId(consumed.cardId)) {
      return;
    }

    actor.hand.splice(index, 1);
    state.pool.push(consumed);

    if (card.isUpgraded) {
      beginSpecialPick(state, { playerId: sourcePlayerId, nowMs });
      return;
    }

    const specialId = rng.pick(TRANSFORM_RESULT_SPECIAL_IDS);
    grantTransformedSpecial(state, sourcePlayerId, specialId);
  },
};
