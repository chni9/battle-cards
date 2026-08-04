/**
 * Targeted pending-effect removal — technical spec v4 §4.2, backlog L20-12.
 *
 * Mutual attacks, the Spy/Thief counter, and Cloning's blanket wipe stay in their
 * existing paths (`outcome: 'cancelled'`). Attack Thief and Block call this primitive
 * for a reasoned removal with `outcome: 'blocked'`.
 */

import type { ActionResolutionOutcome, GameState, PendingEffect } from '@card-battle/shared';

export interface BlockedPendingEffect {
  effect: PendingEffect;
  reason: string;
}

export interface BlockedActionResolved {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: PendingEffect['cardId'];
  isUpgraded: boolean;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: Extract<ActionResolutionOutcome, 'blocked'>;
}

/**
 * Find a pending effect by id on any player, remove it, and return enough for callers
 * to emit `actionResolved` with `outcome: 'blocked'`. Returns `false` when not found.
 */
export function cancelPendingEffect(
  state: GameState,
  effectId: string,
  reason: string,
): BlockedPendingEffect | false {
  for (const player of state.players) {
    const index = player.pendingEffects.findIndex((effect) => effect.id === effectId);

    if (index < 0) {
      continue;
    }

    const [effect] = player.pendingEffects.splice(index, 1);

    if (effect === undefined) {
      return false;
    }

    return { effect, reason };
  }

  return false;
}

/** Build an `actionResolved` payload from a blocked removal. */
export function toBlockedActionResolved(blocked: BlockedPendingEffect): BlockedActionResolved {
  return {
    effectId: blocked.effect.id,
    sourcePlayerId: blocked.effect.sourcePlayerId,
    targetPlayerId: blocked.effect.targetPlayerId,
    cardId: blocked.effect.cardId,
    isUpgraded: blocked.effect.isUpgraded,
    livesLost: 0,
    shieldAbsorbed: 0,
    outcome: 'blocked',
  };
}
