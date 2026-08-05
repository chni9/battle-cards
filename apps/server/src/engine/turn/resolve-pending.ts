/**
 * Resolve pending effects on the active player after their action — technical spec §4.3, §4.6, §4.7.
 *
 * Ascending `queuedAt`. Mutual attacks (L2-05) and Spy/Thief counter (L3-06) cancel
 * reciprocal pairs during resolve so a later cancel of only the counter leaves the original.
 * Untouchable `immuneTo` is checked at resolve (L4-03).
 */

import {
  attackDamageFor,
  isAttackCardId,
  isSharedAttackCardId,
  type ActionResolutionOutcome,
  type CardId,
  type GameState,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import { grantSpy } from '../../protocol/visibility-matrix';
import { stealRandomCard, takeCardFrom } from '../cards/steal-card';
import { downgradeAllCards } from '../economy/downgrade-cards';
import { gainUpgradePoints } from '../economy/gain-upgrade-points';
import { stealPoints } from '../economy/steal-points';
import { stealUpgradePoints } from '../economy/steal-upgrade-points';
import { transferCardInstance } from '../kits/acquire-card';
import { isImmuneTo } from '../kits/is-immune-to';
import { applyDamage } from '../life/apply-damage';
import { applyLifeLoss } from '../life/apply-life-loss';
import type { Rng } from '../rng';
import { playerIsInvisible } from '../specials/is-invisible';
import { poolDeactivatedPersistentEffects } from '../specials/pool-deactivated';
import { findPlayer } from './advance-turn';
import { consumeAttackBlockCharge } from './consume-attack-block';
import { recordEliminationContributor } from './elimination-rewards';

export type ResolveOutcome = ActionResolutionOutcome;

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: ResolveOutcome;
}

const COUNTERABLE_CARD_IDS = new Set<CardId>(['spy', 'thief']);
const SUICIDE_OPPONENT_LIFE_LOSS = 5;

function isCounterableCardId(cardId: CardId): boolean {
  return COUNTERABLE_CARD_IDS.has(cardId);
}

/**
 * Base Suicide self-elim must wait until a *later* turn. Queued on the play turn with
 * `queuedAt === turnSequence`, it would otherwise resolve in the same finishTurnPhases.
 */
function isDeferredSuicideSelf(effect: PendingEffect, turnSequence: number): boolean {
  return (
    effect.cardId === 'suicide' &&
    effect.sourcePlayerId === effect.targetPlayerId &&
    effect.queuedAt === turnSequence
  );
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
 * Mutual attack pair (tech §4.6 / Lot 19): equal damage cancels both; unequal cancels the
 * weaker and leaves the stronger pending. Returns true when the incoming effect is cancelled.
 */
function resolveMutualAttack(
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

  const incomingDamage =
    attackDamageFor(incoming.cardId, incoming.isUpgraded) * incoming.damageMultiplier;
  const retaliationDamage =
    attackDamageFor(retaliation.cardId, retaliation.isUpgraded) * retaliation.damageMultiplier;

  if (incomingDamage === retaliationDamage) {
    // Equal: cancel both.
    source.pendingEffects.splice(retaliationIndex, 1);
    return true;
  }

  if (incomingDamage > retaliationDamage) {
    // Incoming stronger: drop the weaker retaliation; resolve incoming normally.
    source.pendingEffects.splice(retaliationIndex, 1);
    return false;
  }

  // Retaliation stronger: cancel incoming; stronger stays on source's queue.
  return true;
}

function resolveThief(state: GameState, target: Player, effect: PendingEffect): ResolveOutcome {
  // Upgraded Shield blocks Thief at resolve, no shield-point cost (Lot 3 ruling).
  if (target.shield > 0 && target.shieldIsUpgraded) {
    return 'cancelled';
  }

  stealPoints({
    state,
    sourcePlayerId: effect.sourcePlayerId,
    targetPlayerId: target.id,
    amount: 10,
    gainMultiplier: effect.isUpgraded ? 2 : 1,
  });
  return 'applied';
}

function resolveSpy(state: GameState, target: Player, effect: PendingEffect): ResolveOutcome {
  // Upgraded Shield blocks Spy at resolve, no shield-point cost (Lot 3 ruling).
  if (target.shield > 0 && target.shieldIsUpgraded) {
    return 'cancelled';
  }

  grantSpy(
    state,
    effect.sourcePlayerId,
    target.id,
    effect.isUpgraded ? 'full-resources' : 'kit-and-cards',
  );
  return 'applied';
}

function resolveSpyThief(
  state: GameState,
  target: Player,
  effect: PendingEffect,
): ResolveOutcome {
  // Not blocked by upgraded Shield; not covered by Untouchable immuneTo (Lot 5 ruling).
  const amount = target.points;
  stealPoints({
    state,
    sourcePlayerId: effect.sourcePlayerId,
    targetPlayerId: target.id,
    amount,
    gainMultiplier: effect.isUpgraded ? 2 : 1,
  });
  grantSpy(
    state,
    effect.sourcePlayerId,
    target.id,
    effect.isUpgraded ? 'full-resources' : 'kit-and-cards',
  );
  return 'applied';
}

/**
 * Upgrade Point Thief — rules spec §5, L21-02.
 * Not counterable; not blocked by Shield; Untouchable is not immune (#V4-33).
 */
function resolveUpgradePointThief(
  state: GameState,
  target: Player,
  effect: PendingEffect,
): ResolveOutcome {
  const source = findPlayer(state, effect.sourcePlayerId);

  if (source === undefined) {
    return 'applied';
  }

  stealUpgradePoints(source, target);
  const stripped = downgradeAllCards(target);
  gainUpgradePoints(source, stripped, 'direct');

  if (effect.isUpgraded) {
    stealPoints({
      state,
      sourcePlayerId: effect.sourcePlayerId,
      targetPlayerId: target.id,
      amount: target.points,
      gainMultiplier: 1,
    });
  }

  return 'applied';
}

/**
 * Card Thief — rules spec §5, L21-03.
 * Not counterable (#V4-33). Stolen identity stays off the public action log.
 */
function resolveCardThief(
  state: GameState,
  target: Player,
  effect: PendingEffect,
  rng: Rng,
): ResolveOutcome {
  const source = findPlayer(state, effect.sourcePlayerId);

  if (source === undefined) {
    return 'applied';
  }

  const stolen =
    effect.chosenInstanceId !== null
      ? takeCardFrom(target, effect.chosenInstanceId)
      : stealRandomCard(target, rng);

  if (stolen !== undefined) {
    transferCardInstance(source, stolen);
  }

  return 'applied';
}

/**
 * Attack Thief steal — rules spec §5, L23-03 / #V4-31.
 * Shared attack cards only (MEGA excluded). Empty victim → no-op.
 */
function resolveAttackThief(
  state: GameState,
  target: Player,
  effect: PendingEffect,
  rng: Rng,
): ResolveOutcome {
  const source = findPlayer(state, effect.sourcePlayerId);

  if (source === undefined) {
    return 'applied';
  }

  const isSharedAttack = (card: { cardId: string }): boolean =>
    isSharedAttackCardId(card.cardId);

  if (effect.isUpgraded) {
    const sharedAttacks = [...target.hand, ...target.specialCards].filter(isSharedAttack);
    for (const card of sharedAttacks) {
      const taken = takeCardFrom(target, card.instanceId);
      if (taken !== undefined) {
        transferCardInstance(source, taken);
      }
    }
  } else {
    const stolen = stealRandomCard(target, rng, isSharedAttack);
    if (stolen !== undefined) {
      transferCardInstance(source, stolen);
    }
  }

  return 'applied';
}

/**
 * Suicide on an opponent: 5 lives + all points (applyLifeLoss). Suicide on self: eliminate.
 * Opponent kills attribute the Suicide user as eliminator (Lot 5 ruling); self has none.
 */
function resolveSuicide(
  state: GameState,
  target: Player,
  effect: PendingEffect,
): { livesLost: number; outcome: ResolveOutcome } {
  const isSelf = effect.sourcePlayerId === target.id;

  if (isSelf) {
    const livesLost = target.lives;
    // Lethal self-elimination in one step — rules spec §5 (Suicide), technical spec §4.2.
    // Not `applyLifeLoss`: no bounded debit, no card-counter decrement; elimination is step 5.
    target.lives = 0;
    // Self-elim: no third-party contributor (rules spec §6).
    return { livesLost, outcome: 'applied' };
  }

  const loss = applyLifeLoss(target, SUICIDE_OPPONENT_LIFE_LOSS, 'suicide');
  target.points = 0;
  target.turnLedger.livesLost += loss.livesLost;
  recordEliminationContributor(state, target.id, effect.sourcePlayerId, loss.livesLost);

  return { livesLost: loss.livesLost, outcome: 'applied' };
}

export function resolvePendingEffects(
  state: GameState,
  playerId: string,
  rng: Rng,
): ResolvedEffect[] {
  const player = state.players.find((entry) => entry.id === playerId);

  if (player === undefined) {
    throw new Error(`resolvePendingEffects: unknown player ${playerId}`);
  }

  const deferred: PendingEffect[] = [];
  const ready = [...player.pendingEffects]
    .sort((left, right) => left.queuedAt - right.queuedAt)
    .filter((effect) => {
      if (isDeferredSuicideSelf(effect, state.turnSequence)) {
        deferred.push(effect);
        return false;
      }

      return true;
    });
  player.pendingEffects = deferred;

  const resolved: ResolvedEffect[] = [];

  for (const effect of ready) {
    // Invisibility — #V4-9: all opposing pending resolve as immune before mutual cancel.
    if (playerIsInvisible(player)) {
      resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'immune' });
      continue;
    }

    let livesLost = 0;
    let shieldAbsorbed = 0;
    let outcome: ResolveOutcome = 'applied';

    if (isAttackCardId(effect.cardId)) {
      // Attack Thief charge before mutual cancel — #V4-5 / L23-03.
      if (consumeAttackBlockCharge(player, effect)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'blocked' });
        continue;
      }

      if (resolveMutualAttack(state, player, effect)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'cancelled' });
        continue;
      }

      const amount =
        attackDamageFor(effect.cardId, effect.isUpgraded) * effect.damageMultiplier;
      const damageOutcome = applyDamage(player, amount, effect.cardId);
      livesLost = damageOutcome.livesLost;
      shieldAbsorbed = damageOutcome.shieldAbsorbed;
      player.turnLedger.livesLost += damageOutcome.livesLost;
      poolDeactivatedPersistentEffects(state, damageOutcome.deactivatedEffects);
      recordEliminationContributor(state, player.id, effect.sourcePlayerId, livesLost);
      outcome = 'applied';
    } else if (effect.cardId === 'thief' || effect.cardId === 'spy') {
      if (cancelReciprocalCounter(state, player, effect)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'cancelled' });
        continue;
      }

      if (isImmuneTo(player, effect.cardId)) {
        resolved.push({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'immune' });
        continue;
      }

      outcome =
        effect.cardId === 'thief'
          ? resolveThief(state, player, effect)
          : resolveSpy(state, player, effect);
    } else if (effect.cardId === 'suicide') {
      const suicide = resolveSuicide(state, player, effect);
      livesLost = suicide.livesLost;
      outcome = suicide.outcome;
    } else if (effect.cardId === 'spy-thief') {
      outcome = resolveSpyThief(state, player, effect);
    } else if (effect.cardId === 'upgrade-point-thief') {
      outcome = resolveUpgradePointThief(state, player, effect);
    } else if (effect.cardId === 'card-thief') {
      outcome = resolveCardThief(state, player, effect, rng);
    } else if (effect.cardId === 'attack-thief') {
      outcome = resolveAttackThief(state, player, effect, rng);
    } else if (effect.cardId === 'sentence') {
      const livesBefore = player.lives;
      // Instant lethal elimination — rules spec §5 (Sentence), technical spec §4.2.
      // Not `applyDamage` (no shield) and not `applyLifeLoss`: zeroes lives regardless of count.
      player.lives = 0;
      const isSelf = effect.sourcePlayerId === player.id;
      // Lethal effect: record even when lives were already 0 (livesBefore used as signal).
      if (!isSelf) {
        recordEliminationContributor(
          state,
          player.id,
          effect.sourcePlayerId,
          Math.max(livesBefore, 1),
        );
      }
      outcome = 'applied';
      resolved.push({
        effect,
        livesLost: livesBefore,
        shieldAbsorbed: 0,
        outcome,
      });
      continue;
    }

    resolved.push({
      effect,
      livesLost,
      shieldAbsorbed,
      outcome,
    });
  }

  return resolved;
}
