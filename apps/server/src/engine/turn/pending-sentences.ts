/**
 * Ticking Sentence countdown — rules spec §5, designer 2026-09-20 / L63-03.
 *
 * Remaining owner turns are not card-lives. Fire queues elimination for the
 * victim's turn (golden rule 3). Activator death before fire cancels.
 */

import {
  SENTENCE_OWNER_TURNS,
  type GameState,
  type PendingSentence,
  type Player,
} from '@card-battle/shared';

import { createRng } from '../rng';
import { playerIsInvisible } from '../specials/is-invisible';
import { findPlayer } from './advance-turn';
import { queueEffect } from './queue-effect';

export function sentenceCandidates(
  state: GameState,
  sourcePlayerId: string,
  isUpgraded: boolean,
): Player[] {
  return state.players.filter((player) => {
    if (player.isEliminated || player.lives <= 0) {
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

/** Drop unfired Sentences from an eliminated activator. Reanimation does not restore them. */
export function cancelPendingSentencesFrom(state: GameState, sourcePlayerId: string): void {
  if (state.pendingSentences.some((entry) => entry.sourcePlayerId === sourcePlayerId)) {
    state.pendingSentences = state.pendingSentences.filter(
      (entry) => entry.sourcePlayerId !== sourcePlayerId,
    );
  }
}

/**
 * After the activator's action (including the play turn): decrement; on 0, seeded
 * pick and queue. Skip / cancel if the activator is already dead this phase.
 */
export function tickPendingSentences(state: GameState, actorPlayerId: string): void {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined || actor.isEliminated || actor.lives <= 0) {
    cancelPendingSentencesFrom(state, actorPlayerId);
    return;
  }

  const next: PendingSentence[] = [];

  for (const pending of state.pendingSentences) {
    if (pending.sourcePlayerId !== actorPlayerId) {
      next.push(pending);
      continue;
    }

    const remaining = pending.remainingOwnerTurns - 1;

    if (remaining > 0) {
      next.push({ ...pending, remainingOwnerTurns: remaining });
      continue;
    }

    fireSentence(state, actorPlayerId, pending.isUpgraded);
  }

  state.pendingSentences = next;
}

export function startPendingSentence(
  state: GameState,
  sourcePlayerId: string,
  isUpgraded: boolean,
): void {
  state.pendingSentences.push({
    sourcePlayerId,
    remainingOwnerTurns: SENTENCE_OWNER_TURNS,
    isUpgraded,
  });
}

function fireSentence(
  state: GameState,
  sourcePlayerId: string,
  isUpgraded: boolean,
): void {
  const candidates = sentenceCandidates(state, sourcePlayerId, isUpgraded);

  if (candidates.length === 0) {
    return;
  }

  const rng = createRng(state.seed);
  for (let i = 0; i < state.turnSequence; i += 1) {
    rng.nextInt(1);
  }

  const victim = rng.pick(candidates);

  queueEffect({
    state,
    sourcePlayerId,
    targetPlayerId: victim.id,
    cardId: 'sentence',
    isUpgraded,
  });
}
