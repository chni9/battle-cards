/**
 * Resolve pending effects on the active player after their action — technical spec §4.3, §4.6.
 *
 * Ascending `queuedAt`. Before each attack resolution, check mutual cancellation.
 * Thief resolves here (L3-04); Spy/Counter land in later Lot 3 tasks.
 */

import {
  ATTACK_CARD_IDS,
  attackDamageFor,
  type AttackCardId,
  type GameState,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import { stealPoints } from '../economy/steal-points';
import { applyDamage } from '../life/apply-damage';

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
}

function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}

/**
 * Equal-damage mutual pair: cancel both without applyDamage (tech §4.6).
 * Different damage: no interaction — return false and resolve normally.
 */
function cancelEqualMutualAttack(
  state: GameState,
  resolvingPlayer: Player,
  incoming: PendingEffect,
): boolean {
  if (!isAttackCardId(incoming.cardId)) {
    return false;
  }

  const source = state.players.find((player) => player.id === incoming.sourcePlayerId);

  if (source === undefined || source.isEliminated) {
    return false;
  }

  const retaliationIndex = source.pendingEffects.findIndex(
    (effect) =>
      isAttackCardId(effect.cardId) &&
      effect.sourcePlayerId === resolvingPlayer.id &&
      effect.targetPlayerId === source.id,
  );

  if (retaliationIndex < 0) {
    return false;
  }

  const retaliation = source.pendingEffects[retaliationIndex];

  if (retaliation === undefined || !isAttackCardId(retaliation.cardId)) {
    return false;
  }

  const incomingDamage = attackDamageFor(incoming.cardId, incoming.isUpgraded);
  const retaliationDamage = attackDamageFor(retaliation.cardId, retaliation.isUpgraded);

  if (incomingDamage !== retaliationDamage) {
    return false;
  }

  source.pendingEffects.splice(retaliationIndex, 1);
  return true;
}

function resolveThief(state: GameState, target: Player, effect: PendingEffect): void {
  // Upgraded Shield blocks Thief at resolve, no shield-point cost (Lot 3 ruling).
  if (target.shield > 0 && target.shieldIsUpgraded) {
    return;
  }

  stealPoints({
    state,
    sourcePlayerId: effect.sourcePlayerId,
    targetPlayerId: target.id,
    amount: 10,
    gainMultiplier: effect.isUpgraded ? 2 : 1,
  });
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
      if (cancelEqualMutualAttack(state, player, effect)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0 });
        continue;
      }

      const amount = attackDamageFor(effect.cardId, effect.isUpgraded);
      const outcome = applyDamage(player, amount, effect.cardId);
      livesLost = outcome.livesLost;
      shieldAbsorbed = outcome.shieldAbsorbed;
      player.turnLedger.livesLost += outcome.livesLost;
    } else if (effect.cardId === 'thief') {
      resolveThief(state, player, effect);
    }

    resolved.push({
      effect,
      livesLost,
      shieldAbsorbed,
    });
  }

  return resolved;
}
