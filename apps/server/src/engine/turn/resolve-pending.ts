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
  type LogPlayerResourceDelta,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import { grantSpy } from '../../protocol/visibility-matrix';
import { stealRandomCard, takeCardFrom } from '../cards/steal-card';
import { downgradeAllCards } from '../economy/downgrade-cards';
import { grantUpgradePoints } from '../economy/grant-resources';
import { stealPoints } from '../economy/steal-points';
import { stealUpgradePoints } from '../economy/steal-upgrade-points';
import { transferCardInstance } from '../kits/acquire-card';
import { observeLifeLoss } from '../life/observe-life-loss';
import { isImmuneTo } from '../kits/is-immune-to';
import { applyDamage } from '../life/apply-damage';
import { applyLifeLoss } from '../life/apply-life-loss';
import type { Rng } from '../rng';
import { playerIsInvisible } from '../specials/is-invisible';
import { recordAutoDeactivation } from '../specials/auto-deactivation-log';
import { poolDeactivatedPersistentEffects } from '../specials/pool-deactivated';
import {
  transferCursesFromAttacker,
  type CurseTransfer,
} from '../specials/transfer-curses';
import { findPlayer } from './advance-turn';
import {
  duplicatedGainMark,
  playerDeltasSince,
  snapshotAllResources,
} from './resource-log';
import { recordEliminationContributor } from './elimination-rewards';

export type ResolveOutcome = ActionResolutionOutcome;

export type { CurseTransfer };

export interface ResolvedEffect {
  effect: PendingEffect;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: ResolveOutcome;
  /** Curse instances moved when this attack dealt ≥1 life (designer 2026-08-07). */
  curseTransfers?: CurseTransfer[];
  /**
   * Per-seat nets this effect applied. Duplicator copies are omitted so the
   * public resolve line does not identify that kit.
   */
  playerDeltas?: readonly LogPlayerResourceDelta[];
}

const COUNTERABLE_CARD_IDS = new Set<CardId>(['spy', 'thief']);
const SUICIDE_OPPONENT_LIFE_LOSS = 5;

/** Target, then source, then other seats. A steal must not collapse into one net. */
function orderResolvePlayerDeltas(
  effect: PendingEffect,
  deltas: readonly LogPlayerResourceDelta[],
): LogPlayerResourceDelta[] {
  const rank = (playerId: string): number => {
    if (playerId === effect.targetPlayerId) {
      return 0;
    }
    if (playerId === effect.sourcePlayerId) {
      return 1;
    }
    return 2;
  };

  return [...deltas].sort((left, right) => rank(left.playerId) - rank(right.playerId));
}

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
 * Spy/Thief counter (rules spec §1, designer 2026-09-28).
 * Same upgrade level cancels both. An upgraded incoming removes a basic answer
 * and still resolves. A basic incoming is cancelled by an upgraded answer, which
 * stays pending. Mirror is excluded.
 *
 * Returns true when the incoming effect should be cancelled.
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

  const counter = source.pendingEffects[counterIndex];

  if (counter === undefined) {
    return false;
  }

  if (incoming.isUpgraded === counter.isUpgraded) {
    source.pendingEffects.splice(counterIndex, 1);
    return true;
  }

  if (incoming.isUpgraded && !counter.isUpgraded) {
    source.pendingEffects.splice(counterIndex, 1);
    return false;
  }

  return true;
}

/** Final attack damage for mutual compare (#V4-2). */
function attackFinalDamage(effect: PendingEffect): number {
  if (!isAttackCardId(effect.cardId)) {
    return 0;
  }

  return attackDamageFor(effect.cardId, effect.isUpgraded) * effect.damageMultiplier;
}

/**
 * Assassin multi-attack volley: same source, same target, same `queuedAt` (one action).
 * Mirror still addresses a single effect id — this key is cancel-only (L54-02).
 */
function incomingVolleyKey(effect: PendingEffect): string {
  return `${effect.sourcePlayerId}:${effect.targetPlayerId}:${String(effect.queuedAt)}`;
}

function isReciprocalAttack(
  effect: PendingEffect,
  resolvingPlayerId: string,
  sourcePlayerId: string,
): boolean {
  return (
    isAttackCardId(effect.cardId) &&
    effect.sourcePlayerId === resolvingPlayerId &&
    effect.targetPlayerId === sourcePlayerId
  );
}

function byDamageDescending(left: PendingEffect, right: PendingEffect): number {
  return attackFinalDamage(right) - attackFinalDamage(left);
}

function removeEffectsById(player: Player, ids: ReadonlySet<string>): void {
  player.pendingEffects = player.pendingEffects.filter((effect) => !ids.has(effect.id));
}

/**
 * Latest reciprocal attack volley on `source` (max `queuedAt` among resolvingPlayer → source).
 * Older leftovers are a different volley and stay out of this compare.
 */
/**
 * A Mirror redirect of one hit from this same volley keeps the original
 * `queuedAt`. It is not a later answer, so it must not cancel the siblings
 * that still target the Mirror player (designer 2026-09-28). A real
 * retaliation is queued on a different turn.
 */
function isRedirectedFragmentOfIncoming(
  effect: PendingEffect,
  incomingQueuedAt: number,
): boolean {
  return effect.redirectedBy !== null && effect.queuedAt === incomingQueuedAt;
}

function latestRetaliationVolley(
  source: Player,
  resolvingPlayerId: string,
  incomingQueuedAt: number,
): PendingEffect[] {
  const reciprocal = source.pendingEffects.filter(
    (effect) =>
      isReciprocalAttack(effect, resolvingPlayerId, source.id) &&
      !isRedirectedFragmentOfIncoming(effect, incomingQueuedAt),
  );

  if (reciprocal.length === 0) {
    return [];
  }

  let maxQueuedAt = reciprocal[0]?.queuedAt ?? 0;

  for (const effect of reciprocal) {
    if (effect.queuedAt > maxQueuedAt) {
      maxQueuedAt = effect.queuedAt;
    }
  }

  return reciprocal.filter((effect) => effect.queuedAt === maxQueuedAt);
}

/**
 * Answers whose damage adds up to `target`, or null when no subset does.
 * Used so several small attacks can cancel one bigger hit (designer 2026-09-29).
 */
function exactDamageSubset(
  answers: readonly PendingEffect[],
  target: number,
): PendingEffect[] | null {
  if (target <= 0) {
    return null;
  }

  const cameFrom = new Array<number>(target + 1).fill(-2);
  cameFrom[0] = -1;

  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];
    if (answer === undefined) {
      continue;
    }
    const damage = attackFinalDamage(answer);
    if (damage <= 0 || damage > target) {
      continue;
    }
    for (let sum = target; sum >= damage; sum -= 1) {
      if (cameFrom[sum] === -2 && cameFrom[sum - damage] !== -2) {
        cameFrom[sum] = index;
      }
    }
  }

  if (cameFrom[target] === -2) {
    return null;
  }

  const picked: PendingEffect[] = [];
  let sum = target;
  while (sum > 0) {
    const index = cameFrom[sum];
    if (index === undefined || index < 0) {
      return null;
    }
    const answer = answers[index];
    if (answer === undefined) {
      return null;
    }
    picked.push(answer);
    sum -= attackFinalDamage(answer);
  }

  return picked;
}

/**
 * Mutual attacks (rules spec §6, designer 2026-09-29).
 * Equal hits cancel each other first, so a Strong in a multi-attack still
 * cancels one Strong and the extra Basic goes through alone. Several answers
 * sum only to match one bigger hit exactly. One answer that covers every
 * remaining incoming hit cancels all of them and stays when it is stronger.
 * Otherwise a stronger answer cancels one weaker hit and stays pending.
 */
function decideMutualAttack(
  state: GameState,
  resolvingPlayer: Player,
  incoming: PendingEffect,
  remainingIncomingVolley: readonly PendingEffect[],
): readonly string[] {
  if (!isAttackCardId(incoming.cardId)) {
    return [];
  }

  const source = state.players.find((player) => player.id === incoming.sourcePlayerId);

  if (source === undefined) {
    return [];
  }

  const retaliationVolley = latestRetaliationVolley(
    source,
    resolvingPlayer.id,
    incoming.queuedAt,
  );

  if (retaliationVolley.length === 0) {
    return [];
  }

  const cancelIncoming: string[] = [];
  const cancelRetaliation = new Set<string>();
  let incomingLeft = [...remainingIncomingVolley];
  let answersLeft = [...retaliationVolley];

  incomingLeft.sort(byDamageDescending);
  const afterEquals: PendingEffect[] = [];
  for (const hit of incomingLeft) {
    const matchIndex = answersLeft.findIndex(
      (answer) => attackFinalDamage(answer) === attackFinalDamage(hit),
    );
    const match = matchIndex >= 0 ? answersLeft[matchIndex] : undefined;
    if (match !== undefined) {
      answersLeft.splice(matchIndex, 1);
      cancelIncoming.push(hit.id);
      cancelRetaliation.add(match.id);
    } else {
      afterEquals.push(hit);
    }
  }
  incomingLeft = afterEquals;

  incomingLeft.sort(byDamageDescending);
  const afterSubsets: PendingEffect[] = [];
  for (const hit of incomingLeft) {
    const subset = exactDamageSubset(answersLeft, attackFinalDamage(hit));
    if (subset !== null) {
      cancelIncoming.push(hit.id);
      for (const answer of subset) {
        cancelRetaliation.add(answer.id);
      }
      const spent = new Set(subset.map((answer) => answer.id));
      answersLeft = answersLeft.filter((answer) => !spent.has(answer.id));
    } else {
      afterSubsets.push(hit);
    }
  }
  incomingLeft = afterSubsets;

  if (incomingLeft.length > 0 && answersLeft.length > 0) {
    let incomingSum = 0;
    for (const hit of incomingLeft) {
      incomingSum += attackFinalDamage(hit);
    }
    const covers = answersLeft
      .filter((answer) => attackFinalDamage(answer) >= incomingSum)
      .sort((left, right) => attackFinalDamage(left) - attackFinalDamage(right));
    const cover = covers[0];
    if (cover !== undefined) {
      for (const hit of incomingLeft) {
        cancelIncoming.push(hit.id);
      }
      incomingLeft = [];
      if (attackFinalDamage(cover) === incomingSum) {
        cancelRetaliation.add(cover.id);
        answersLeft = answersLeft.filter((answer) => answer.id !== cover.id);
      }
    }
  }

  incomingLeft.sort(byDamageDescending);
  answersLeft.sort(byDamageDescending);
  const usedStronger = new Set<string>();
  for (const hit of incomingLeft) {
    const answer = answersLeft.find(
      (candidate) =>
        !usedStronger.has(candidate.id) &&
        attackFinalDamage(candidate) > attackFinalDamage(hit),
    );
    if (answer !== undefined) {
      usedStronger.add(answer.id);
      cancelIncoming.push(hit.id);
    }
  }

  if (cancelRetaliation.size > 0) {
    removeEffectsById(source, cancelRetaliation);
  }

  // A corpse never takes a turn, so an answer must not stay queued on them.
  if (source.isEliminated) {
    const leftover = source.pendingEffects.filter((effect) =>
      isReciprocalAttack(effect, resolvingPlayer.id, source.id),
    );
    removeEffectsById(source, new Set(leftover.map((effect) => effect.id)));
  }

  return cancelIncoming;
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
 * Upgrade Point Thief — rules spec §5, L21-02, designer 2026-09-28.
 * Not counterable; not blocked by Shield; Untouchable is not immune (#V4-33).
 * Does not steal points.
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

  stealUpgradePoints(state, source, target);
  const stripped = downgradeAllCards(target);
  grantUpgradePoints(state, source, stripped, 'direct');

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
    // Ghost (#V4-22): credit lives before the lethal assignment.
    observeLifeLoss(state, target, livesLost);
    target.lives = 0;
    // Self-elim: no third-party contributor (rules spec §6).
    return { livesLost, outcome: 'applied' };
  }

  const loss = applyLifeLoss(target, SUICIDE_OPPONENT_LIFE_LOSS, 'suicide');
  target.points = 0;
  target.turnLedger.livesLost += loss.livesLost;
  observeLifeLoss(state, target, loss.livesLost);
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
  const cancelIncomingIds = new Set<string>();
  const appliedVolleyKeys = new Set<string>();

  for (const effect of ready) {
    const beforeResources = snapshotAllResources(state);
    const gainMark = duplicatedGainMark(state);
    const pushResolved = (entry: ResolvedEffect): void => {
      const playerDeltas = orderResolvePlayerDeltas(
        effect,
        playerDeltasSince(state, beforeResources, gainMark),
      );
      resolved.push({
        ...entry,
        ...(playerDeltas.length > 0 ? { playerDeltas } : {}),
      });
    };

    // Invisibility — #V4-9: all opposing pending resolve as immune before mutual cancel.
    if (playerIsInvisible(player)) {
      pushResolved({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'immune' });
      continue;
    }

    let livesLost = 0;
    let shieldAbsorbed = 0;
    let outcome: ResolveOutcome = 'applied';

    if (isAttackCardId(effect.cardId)) {
      if (cancelIncomingIds.has(effect.id)) {
        pushResolved({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'cancelled' });
        continue;
      }

      const key = incomingVolleyKey(effect);

      if (!appliedVolleyKeys.has(key) && !cancelIncomingIds.has(effect.id)) {
        const resolvedIds = new Set(resolved.map((entry) => entry.effect.id));
        const remainingIncomingVolley = ready.filter(
          (candidate) =>
            isAttackCardId(candidate.cardId) &&
            incomingVolleyKey(candidate) === key &&
            !resolvedIds.has(candidate.id) &&
            !cancelIncomingIds.has(candidate.id),
        );
        const cancelled = decideMutualAttack(
          state,
          player,
          effect,
          remainingIncomingVolley,
        );

        for (const id of cancelled) {
          cancelIncomingIds.add(id);
        }

        appliedVolleyKeys.add(key);

        if (cancelIncomingIds.has(effect.id)) {
          pushResolved({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'cancelled' });
          continue;
        }
      }

      const amount =
        attackDamageFor(effect.cardId, effect.isUpgraded) * effect.damageMultiplier;
      const damageOutcome = applyDamage(player, amount, effect.cardId);
      livesLost = damageOutcome.livesLost;
      shieldAbsorbed = damageOutcome.shieldAbsorbed;
      player.turnLedger.livesLost += damageOutcome.livesLost;
      observeLifeLoss(state, player, damageOutcome.livesLost);
      for (const deactivated of damageOutcome.deactivatedEffects) {
        recordAutoDeactivation(state, player.id, deactivated);
      }
      poolDeactivatedPersistentEffects(state, damageOutcome.deactivatedEffects);
      recordEliminationContributor(state, player.id, effect.sourcePlayerId, livesLost);
      outcome = 'applied';

      // Pass every Curse on the attacker when the hit deals life (designer 2026-08-07).
      const curseTransfers =
        livesLost >= 1
          ? transferCursesFromAttacker(state, effect.sourcePlayerId, player.id)
          : [];

      pushResolved({
        effect,
        livesLost,
        shieldAbsorbed,
        outcome,
        ...(curseTransfers.length > 0 ? { curseTransfers } : {}),
      });
      continue;
    } else if (effect.cardId === 'thief' || effect.cardId === 'spy') {
      if (cancelReciprocalCounter(state, player, effect)) {
        pushResolved({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'cancelled' });
        continue;
      }

      if (isImmuneTo(player, effect.cardId)) {
        pushResolved({ effect, livesLost: 0, shieldAbsorbed: 0, outcome: 'immune' });
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
      // Ghost (#V4-22): credit lives before the lethal assignment.
      observeLifeLoss(state, player, livesBefore);
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
      pushResolved({
        effect,
        livesLost: livesBefore,
        shieldAbsorbed: 0,
        outcome,
      });
      continue;
    }

    pushResolved({
      effect,
      livesLost,
      shieldAbsorbed,
      outcome,
    });
  }

  return resolved;
}
