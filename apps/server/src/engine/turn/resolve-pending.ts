/**
 * Resolve pending effects on the active player after their action — technical spec §4.3.
 *
 * Ascending `queuedAt`. Mutual-attack cancellation is L2-05 — not applied here.
 */

import type { GameState, PendingEffect } from '@card-battle/shared';

import { applyDamage } from '../life/apply-damage';

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
}

/**
 * Basic-attack damage by upgrade — rules spec §2.
 * Strong/super arrive in lot 2; unknown cards yield 0 (should not be queued in L1).
 */
function damageFor(effect: PendingEffect): number {
  if (effect.cardId === 'basic-attack') {
    return effect.isUpgraded ? 3 : 1;
  }

  return 0;
}

export function resolvePendingEffects(
  state: GameState,
  playerId: string,
): ResolvedEffect[] {
  const player = state.players.find((entry) => entry.id === playerId);

  if (player === undefined) {
    throw new Error(`resolvePendingEffects: unknown player ${playerId}`);
  }

  const ordered = [...player.pendingEffects].sort((left, right) => left.queuedAt - right.queuedAt);
  player.pendingEffects = [];

  const resolved: ResolvedEffect[] = [];

  for (const effect of ordered) {
    let livesLost = 0;
    let shieldAbsorbed = 0;

    if (effect.cardId === 'basic-attack') {
      const amount = damageFor(effect);
      const outcome = applyDamage(player, amount, 'basic-attack');
      livesLost = outcome.livesLost;
      shieldAbsorbed = outcome.shieldAbsorbed;
      player.turnLedger.livesLost += outcome.livesLost;
    }

    resolved.push({
      effect,
      livesLost,
      shieldAbsorbed,
    });
  }

  return resolved;
}
