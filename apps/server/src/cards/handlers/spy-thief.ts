/**
 * Spy Thief — rules spec §5, Lot 71.
 *
 * Base: one chosen living opponent. Upgraded: every living opponent.
 * Resolve steals all points (no cap, no doubling) and grants Spy+ visibility
 * (kit, cards, and live resources) for the rest of the game.
 * Invisible living seats are not targets (L65-02).
 * Not counterable; not blocked by upgraded Shield; Untouchable is not immune.
 */

import type { GameState } from '@card-battle/shared';

import { isIllegalOpposingTarget } from '../../engine/specials/is-invisible';
import { findPlayer } from '../../engine/turn/advance-turn';
import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function livingTargets(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter(
      (player) =>
        player.id !== sourcePlayerId &&
        !player.isEliminated &&
        !isIllegalOpposingTarget(player),
    )
    .map((player) => player.id);
}

export const spyThiefHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    const { state, sourcePlayerId, card, targetPlayerId } = context;

    if (card.isUpgraded) {
      return targetPlayerId === null && livingTargets(state, sourcePlayerId).length > 0;
    }

    if (targetPlayerId === null || targetPlayerId === sourcePlayerId) {
      return false;
    }

    const target = findPlayer(state, targetPlayerId);

    return (
      target !== undefined &&
      !target.isEliminated &&
      !isIllegalOpposingTarget(target)
    );
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card, targetPlayerId } = context;
    const targets = card.isUpgraded
      ? livingTargets(state, sourcePlayerId)
      : targetPlayerId === null
        ? []
        : [targetPlayerId];

    for (const targetId of targets) {
      queueEffect({
        state,
        sourcePlayerId,
        targetPlayerId: targetId,
        cardId: 'spy-thief',
        isUpgraded: card.isUpgraded,
      });
    }
  },
};
