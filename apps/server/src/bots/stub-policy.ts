/**
 * Stub Mirror / reward picks for Lot 15 — technical spec v3 §4.6 (L15-04).
 *
 * Deterministic first-legal choices only. L16 replaces these with the heuristic.
 */

import type { GameState, RewardChoice } from '@card-battle/shared';

import { findPlayer } from '../engine/turn/advance-turn';
import { listEligibleMirrorTargets } from '../engine/turn/mirror-choice';

export interface StubMirrorPick {
  pendingEffectId: string;
  newTargetPlayerId: string;
}

/**
 * First eligible pending effect + first other non-eliminated player in seat order.
 * Seat-order tiebreak is acceptable for the stub; L16 must use rng (never seat order).
 */
export function pickStubMirrorChoice(state: GameState): StubMirrorPick | null {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return null;
  }

  const owner = findPlayer(state, choice.playerId);

  if (owner === undefined) {
    return null;
  }

  const eligible = listEligibleMirrorTargets(owner, choice.isUpgraded).filter((effect) =>
    choice.eligibleEffectIds.includes(effect.id),
  );
  const firstEffect = eligible[0];

  if (firstEffect === undefined) {
    return null;
  }

  const newTarget = state.players.find(
    (player) => player.id !== owner.id && !player.isEliminated,
  );

  if (newTarget === undefined) {
    return null;
  }

  return {
    pendingEffectId: firstEffect.id,
    newTargetPlayerId: newTarget.id,
  };
}

/** Same payload as the human timer default, applied inline (no timer). */
export function stubRewardChoices(): [RewardChoice, RewardChoice] {
  return [{ type: 'lives' }, { type: 'lives' }];
}
