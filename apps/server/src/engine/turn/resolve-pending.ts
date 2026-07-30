/**
 * Resolve pending effects on the active player after their action — technical spec §4.3, §4.6, §4.7.
 *
 * Ascending `queuedAt`. Mutual attacks (L2-05) and Spy/Thief counter (L3-06) cancel
 * reciprocal pairs during resolve so a later cancel of only the counter leaves the original.
 */

import {
  ATTACK_CARD_IDS,
  attackDamageFor,
  type AttackCardId,
  type CardId,
  type GameState,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import { stealPoints } from '../economy/steal-points';
import { applyDamage } from '../life/apply-damage';
import { grantSpy } from '../../protocol/visibility-matrix';

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
}

const COUNTERABLE_CARD_IDS = new Set<CardId>(['spy', 'thief']);

function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}

function isCounterableCardId(cardId: CardId): boolean {
  return COUNTERABLE_CARD_IDS.has(cardId);
}

/**
 * Spy/Thief counter: same card played back at the source cancels both at resolve
 * (rules spec §1, tech §4.7). Mirror is excluded.
 */
function cancelReciprocalCounter(
  state: GameState,
  resolvingPlayer: Player,
  incoming: PendingEffect,
): boolean {
  if (!isCounterableCardId(incoming.cardId)) {
    return false;
  }

  const source = state.players.find((player) => player.id === incoming.sourcePlayerId);

  if (source === undefined || source.isEliminated) {
    return false;
  }

  const counterIndex = source.pendingEffects.findIndex(
    (effect) =>
      effect.cardId === incoming.cardId &&
      effect.sourcePlayerId === resolvingPlayer.id &&
      effect.targetPlayerId === source.id,
  );

  if (counterIndex < 0) {
    return false;
  }

  source.pendingEffects.splice(counterIndex, 1);
  return true;
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

function resolveSpy(state: GameState, target: Player, effect: PendingEffect): void {
  // Upgraded Shield blocks Spy at resolve, no shield-point cost (Lot 3 ruling).
  if (target.shield > 0 && target.shieldIsUpgraded) {
    return;
  }

  grantSpy(
    state,
    effect.sourcePlayerId,
    target.id,
    effect.isUpgraded ? 'full-resources' : 'kit-and-cards',
  );
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
    } else if (effect.cardId === 'thief' || effect.cardId === 'spy') {
      if (cancelReciprocalCounter(state, player, effect)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0 });
        continue;
      }

      if (effect.cardId === 'thief') {
        resolveThief(state, player, effect);
      } else {
        resolveSpy(state, player, effect);
      }
    }

    resolved.push({
      effect,
      livesLost,
      shieldAbsorbed,
    });
  }

  return resolved;
}
