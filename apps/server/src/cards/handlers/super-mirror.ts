/**
 * Super Mirror — rules spec §5, backlog L23-02.
 *
 * Redirects every pending attack on the user to every alive opponent (#V4-4: no
 * choice). Uses `duplicatePendingEffect` with `redirectedBy: 'super-mirror'`.
 * Upgraded doubles `damageMultiplier` on the copies.
 */

import type { GameState } from '@card-battle/shared';

import { findPlayer } from '../../engine/turn/advance-turn';
import { duplicatePendingEffect } from '../../engine/turn/duplicate-pending-effect';
import { listEligibleSuperMirrorTargets } from '../../engine/turn/mirror-choice';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const superMirrorHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return false;
    }

    return listEligibleSuperMirrorTargets(actor).length > 0;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card } = context;
    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const eligible = listEligibleSuperMirrorTargets(actor);
    const opponents = aliveOpponents(state, sourcePlayerId);
    const originalIds = new Set(eligible.map((effect) => effect.id));

    for (const effect of eligible) {
      for (const opponentId of opponents) {
        const duplicate = duplicatePendingEffect(
          state,
          effect,
          opponentId,
          'super-mirror',
          sourcePlayerId,
        );
        if (card.isUpgraded) {
          duplicate.damageMultiplier *= 2;
        }
      }
    }

    actor.pendingEffects = actor.pendingEffects.filter(
      (effect) => !originalIds.has(effect.id),
    );
  },
};
