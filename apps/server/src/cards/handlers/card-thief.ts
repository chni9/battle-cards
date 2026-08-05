/**
 * Card Thief — rules spec §5, backlog L21-03.
 *
 * Base: choose one opponent; steal a random card (hand + specials, #V4-19), or a
 * chosen card if that opponent is spied by the user (#V4-35). Empty victim is a
 * legal no-op (#V4-34). Upgraded: one steal per alive opponent.
 *
 * Effects queue; resolve on the victim's turn. Spied picks use `stealChoice`.
 * Not counterable (#V4-33).
 */

import type { GameState } from '@card-battle/shared';

import { findPlayer } from '../../engine/turn/advance-turn';
import { queueEffect } from '../../engine/turn/queue-effect';
import {
  beginStealChoice,
  isSpiedByUser,
  listStealEligibleInstanceIds,
} from '../../engine/turn/steal-choice';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

function needsStealPick(
  state: GameState,
  thiefPlayerId: string,
  victimPlayerId: string,
): boolean {
  if (!isSpiedByUser(state, thiefPlayerId, victimPlayerId)) {
    return false;
  }

  const victim = findPlayer(state, victimPlayerId);

  if (victim === undefined) {
    return false;
  }

  return listStealEligibleInstanceIds(victim).length > 0;
}

export const cardThiefHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    const { state, sourcePlayerId, targetPlayerId, card } = context;

    if (card.isUpgraded) {
      return targetPlayerId === null;
    }

    if (targetPlayerId === null) {
      return false;
    }

    const target = findPlayer(state, targetPlayerId);
    return target !== undefined && !target.isEliminated && target.id !== sourcePlayerId;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, targetPlayerId, card } = context;

    if (card.isUpgraded) {
      const victims = aliveOpponents(state, sourcePlayerId);
      const spiedWithCards: string[] = [];
      const immediate: string[] = [];

      for (const victimId of victims) {
        if (needsStealPick(state, sourcePlayerId, victimId)) {
          spiedWithCards.push(victimId);
        } else {
          immediate.push(victimId);
        }
      }

      for (const victimId of immediate) {
        queueEffect({
          state,
          sourcePlayerId,
          targetPlayerId: victimId,
          cardId: 'card-thief',
          isUpgraded: true,
          chosenInstanceId: null,
        });
      }

      const [first, ...rest] = spiedWithCards;

      if (first !== undefined) {
        beginStealChoice(state, {
          thiefPlayerId: sourcePlayerId,
          victimPlayerId: first,
          pendingSpiedVictimIds: rest,
          cardIsUpgraded: true,
          nowMs: context.nowMs,
        });
      }

      return;
    }

    if (targetPlayerId === null) {
      return;
    }

    if (needsStealPick(state, sourcePlayerId, targetPlayerId)) {
      beginStealChoice(state, {
        thiefPlayerId: sourcePlayerId,
        victimPlayerId: targetPlayerId,
        pendingSpiedVictimIds: [],
        cardIsUpgraded: false,
        nowMs: context.nowMs,
      });
      return;
    }

    queueEffect({
      state,
      sourcePlayerId,
      targetPlayerId,
      cardId: 'card-thief',
      isUpgraded: false,
      chosenInstanceId: null,
    });
  },
};
