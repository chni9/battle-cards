/**
 * Resolve pending effects on the active player after their action — technical spec §4.3.
 *
 * Ascending `queuedAt`. Mutual-attack cancellation is L2-05 — not applied here.
 */

import {
  ATTACK_CARD_IDS,
  attackDamageFor,
  type AttackCardId,
  type GameState,
  type PendingEffect,
} from '@card-battle/shared';

import { applyDamage } from '../life/apply-damage';

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
}

function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
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

    if (isAttackCardId(effect.cardId)) {
      const amount = attackDamageFor(effect.cardId, effect.isUpgraded);
      const outcome = applyDamage(player, amount, effect.cardId);
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
