/**
 * Turn actions — draw, play, buy, sell.
 * Technical spec §4.3, §5.2, §5.4 · rules spec §1, §2, §6 · backlog L2-01.
 */

import {
  getKit,
  isSharedAttackCardId,
  isPersistentSpecialCardId,
  type ActionResolutionOutcome,
  type CardId,
  type CardInstance,
  type GameState,
  type RewardChoice,
} from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { buyCard } from '../economy/buy-card';
import { buySpecialCard } from '../economy/buy-special-card';
import { sellCard } from '../economy/sell-card';
import { upgradeCard } from '../economy/upgrade-card';
import { gainPoints } from '../economy/gain-points';
import { buyUpgradePoint, sellUpgradePoint } from '../economy/upgrade-points';
import type { Rng } from '../rng';
import { createRng } from '../rng';
import { advanceTurn, findPlayer } from './advance-turn';
import { applyPersistentEffects } from './apply-persistent-effects';
import {
  applyDefaultMirrorRedirect,
  type MirrorRedirectInfo,
  redirectPendingAttack,
} from './mirror-choice';
import { applyDefaultStealPick, applyStealPick } from './steal-choice';
import {
  applyDefaultEliminationRewards,
  applyEliminationRewardChoices,
  hasPendingEliminationRewards,
  processEliminations,
  type EliminationEvent,
} from './elimination-rewards';
import { canAffordPlayPoints, playPointsCost } from './play-cost';
import { resolvePendingEffects, type ResolvedEffect } from './resolve-pending';
import { hasActiveSubChoice } from './sub-choice';

export type TurnAction =
  | { type: 'draw' }
  | { type: 'playCard'; instanceId: string; targetPlayerId?: string; quantity?: number }
  | {
      type: 'playMultipleAttacks';
      attacks: readonly { instanceId: string; targetPlayerId: string }[];
    }
  | { type: 'buyCard'; cardId: CardId }
  | { type: 'sellCard'; instanceId: string }
  | { type: 'upgradeCard'; instanceId: string }
  | { type: 'buyUpgradePoint' }
  | { type: 'sellUpgradePoint' }
  | { type: 'buySpecialCard' };

export type PublicActionKind =
  | 'draw'
  | 'playCard'
  | 'playMultipleAttacks'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint'
  | 'buySpecialCard';

export interface ActionPlayedEvent {
  actorPlayerId: string;
  action: PublicActionKind;
  cardId?: CardId;
  isUpgraded?: boolean;
  targetPlayerId?: string;
  attacks?: readonly { cardId: CardId; targetPlayerId: string; isUpgraded: boolean }[];
  turnSequence: number;
}

export interface ActionResolvedEvent {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: ActionResolutionOutcome;
}

export interface TurnResult {
  ok: true;
  actionPlayed: ActionPlayedEvent;
  resolved: ActionResolvedEvent[];
  /** Set when exactly one non-eliminated player remains after this turn. */
  winnerPlayerId: string | null;
  eliminatedPlayerIds: string[];
  /** Eliminator attribution per eliminated player (Lot 6). */
  eliminations: EliminationEvent[];
  /** True when Mirror paid and is waiting for chooseMirrorTarget / default. */
  mirrorChoicePending?: boolean;
  /** True when Card Thief steal-pick is waiting (L21-03). */
  stealChoicePending?: boolean;
  /** True when elimination rewards are waiting for chooseEliminationReward / default. */
  rewardChoicePending?: boolean;
  /**
   * Present when this result completes a Mirror redirect (choice or default).
   * Room logs `mirrorRedirected` instead of a second `actionPlayed` for Mirror.
   */
  mirrorRedirect?: MirrorRedirectInfo & { turnSequence: number };
}

export interface TurnRejection {
  ok: false;
  message: string;
}

export type PerformActionResult = TurnResult | TurnRejection;

/**
 * Perform the active player's single action, then resolve their pending queue, then
 * check elimination and advance. Rejects a second action via the caller's
 * `actionTakenThisTurn` flag — this function assumes it is legal to act.
 */
export function performTurnAction(
  state: GameState,
  actorPlayerId: string,
  action: TurnAction,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  if (state.currentTurnPlayerId !== actorPlayerId) {
    return { ok: false, message: 'It is not your turn.' };
  }

  // Single sub-choice gate (technical spec v4 §4.4/§10.2) — Mirror or elimination
  // reward, whichever is active. Unreachable in practice today: the room blocks
  // Mirror earlier and the sub-choice loop always drains before another action is
  // possible, but the enumerator (`listLegalActions`) needs the same predicate, so
  // this function must not be the odd one out.
  if (hasActiveSubChoice(state)) {
    return {
      ok: false,
      message:
        state.mirrorChoice !== null
          ? 'Finish your Mirror choice first.'
          : state.stealChoice !== null
            ? 'Finish your Card Thief choice first.'
            : 'Finish elimination rewards first.',
    };
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined || actor.isEliminated) {
    return { ok: false, message: 'You are not an active player.' };
  }

  let actionPlayed: ActionPlayedEvent;

  if (action.type === 'draw') {
    gainPoints(actor, getKit(actor.kitId).startingResources.draw, 'direct');
    actionPlayed = {
      actorPlayerId,
      action: 'draw',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buyCard') {
    const bought = buyCard(state, actorPlayerId, action.cardId);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buyCard',
      cardId: bought.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'sellCard') {
    const sold = sellCard(state, actorPlayerId, action.instanceId);

    if (!sold.ok) {
      return sold;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'sellCard',
      cardId: sold.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'upgradeCard') {
    const upgraded = upgradeCard(state, actorPlayerId, action.instanceId);

    if (!upgraded.ok) {
      return upgraded;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'upgradeCard',
      cardId: upgraded.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buyUpgradePoint') {
    const bought = buyUpgradePoint(state, actorPlayerId);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buyUpgradePoint',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'sellUpgradePoint') {
    const sold = sellUpgradePoint(state, actorPlayerId);

    if (!sold.ok) {
      return sold;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'sellUpgradePoint',
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'buySpecialCard') {
    const bought = buySpecialCard(state, actorPlayerId, rng);

    if (!bought.ok) {
      return bought;
    }

    actionPlayed = {
      actorPlayerId,
      action: 'buySpecialCard',
      cardId: bought.instance.cardId,
      turnSequence: state.turnSequence,
    };
  } else if (action.type === 'playMultipleAttacks') {
    const multi = playMultipleAttacksAction(state, actorPlayerId, action.attacks, rng, nowMs);

    if (!multi.ok) {
      return multi;
    }

    actionPlayed = multi.actionPlayed;
  } else {
    const playResult = playCardAction(
      state,
      actorPlayerId,
      action.instanceId,
      action.targetPlayerId,
      action.quantity,
      rng,
      nowMs,
    );

    if (!playResult.ok) {
      return playResult;
    }

    actionPlayed = playResult.actionPlayed;
  }

  // Mirror / steal-pick start a sub-choice: paid, but resolve/advance wait.
  if (state.mirrorChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      mirrorChoicePending: true,
    };
  }

  if (state.stealChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  return finishTurnPhases(state, actorPlayerId, actionPlayed, rng, nowMs);
}

/**
 * Complete a Mirror redirect then finish the Mirror user's turn (resolve + advance).
 */
export function completeMirrorChoice(
  state: GameState,
  actorPlayerId: string,
  pendingEffectId: string,
  newTargetPlayerId: string,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.mirrorChoice;

  if (choice?.playerId !== actorPlayerId) {
    return { ok: false, message: 'No Mirror choice pending.' };
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return { ok: false, message: 'It is not your turn.' };
  }

  if (!choice.eligibleEffectIds.includes(pendingEffectId)) {
    return { ok: false, message: 'That pending attack is not available.' };
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const redirected = redirectPendingAttack(
    state,
    actor,
    pendingEffectId,
    newTargetPlayerId,
    choice.isUpgraded,
  );

  if (!redirected.ok) {
    return redirected;
  }

  const turnSequence = state.turnSequence;
  state.mirrorChoice = null;

  const result = finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'mirror',
      turnSequence,
    },
    rng,
    nowMs,
  );

  return {
    ...result,
    mirrorRedirect: { ...redirected.redirect, turnSequence },
  };
}

/**
 * Apply Mirror default redirect on sub-choice expiry, then finish the turn.
 */
export function expireMirrorChoice(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return { ok: false, message: 'No Mirror choice pending.' };
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultMirrorRedirect(state, rng);

  if (!applied.ok) {
    return applied;
  }

  const turnSequence = state.turnSequence;
  state.mirrorChoice = null;

  const result = finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'mirror',
      turnSequence,
    },
    rng,
    nowMs,
  );

  return {
    ...result,
    mirrorRedirect: { ...applied.redirect, turnSequence },
  };
}

/**
 * Complete a Card Thief steal-pick then finish the thief's turn (or raise the next pick).
 */
export function completeStealChoice(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
  rng: Rng = createRng(`${state.seed}:turn:${state.turnSequence}`),
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.stealChoice;

  if (choice?.playerId !== actorPlayerId) {
    return { ok: false, message: 'No steal choice pending.' };
  }

  if (state.currentTurnPlayerId !== actorPlayerId) {
    return { ok: false, message: 'It is not your turn.' };
  }

  const applied = applyStealPick(state, instanceId, nowMs);

  if (!applied.ok) {
    return applied;
  }

  if (applied.stillPending) {
    return {
      ok: true,
      actionPlayed: {
        actorPlayerId,
        action: 'playCard',
        cardId: 'card-thief',
        turnSequence: state.turnSequence,
      },
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-thief',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

/**
 * Apply Card Thief steal-pick default on sub-choice expiry, then finish the turn
 * (or raise the next pick).
 */
export function expireStealChoice(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): PerformActionResult {
  const choice = state.stealChoice;

  if (choice === null) {
    return { ok: false, message: 'No steal choice pending.' };
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultStealPick(state, rng, nowMs);

  if (!applied.ok) {
    return applied;
  }

  if (applied.stillPending) {
    return {
      ok: true,
      actionPlayed: {
        actorPlayerId,
        action: 'playCard',
        cardId: 'card-thief',
        turnSequence: state.turnSequence,
      },
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      eliminations: [],
      stealChoicePending: true,
    };
  }

  return finishTurnPhases(
    state,
    actorPlayerId,
    {
      actorPlayerId,
      action: 'playCard',
      cardId: 'card-thief',
      turnSequence: state.turnSequence,
    },
    rng,
    nowMs,
  );
}

export type EliminationRewardTurnResult =
  | {
      ok: true;
      rewardChoicePending: boolean;
      winnerPlayerId: string | null;
      rewardsClaimed: {
        eliminatorPlayerId: string;
        eliminatedPlayerId: string;
      };
    }
  | { ok: false; message: string };

/**
 * Apply the eliminator's reward picks, then continue the queue or resume the turn.
 */
export function completeEliminationRewardChoice(
  state: GameState,
  chooserPlayerId: string,
  eliminationId: string,
  choices: readonly [RewardChoice, RewardChoice],
  nowMs: number = Date.now(),
): EliminationRewardTurnResult {
  return applyEliminationRewardChoices(state, chooserPlayerId, eliminationId, choices, nowMs);
}

/**
 * Grant 2×4 lives on reward sub-choice expiry (technical spec §5.6).
 */
export function expireEliminationRewardChoice(
  state: GameState,
  nowMs: number = Date.now(),
): EliminationRewardTurnResult {
  return applyDefaultEliminationRewards(state, nowMs);
}

function finishTurnPhases(
  state: GameState,
  actorPlayerId: string,
  actionPlayed: ActionPlayedEvent,
  rng: Rng,
  nowMs: number,
): TurnResult {
  const resolvedEffects = resolvePendingEffects(state, actorPlayerId, rng);
  applyPersistentEffects(state, actorPlayerId);
  const eliminations = processEliminations(state, rng, nowMs);
  const eliminatedPlayerIds = eliminations.map((entry) => entry.playerId);

  if (hasPendingEliminationRewards(state)) {
    return {
      ok: true,
      actionPlayed,
      resolved: toResolvedEvents(resolvedEffects),
      winnerPlayerId: null,
      eliminatedPlayerIds,
      eliminations,
      rewardChoicePending: true,
    };
  }

  const winnerPlayerId = findWinner(state);

  if (winnerPlayerId === null) {
    advanceTurn(state);
  } else {
    state.currentTurnPlayerId = null;
  }

  return {
    ok: true,
    actionPlayed,
    resolved: toResolvedEvents(resolvedEffects),
    winnerPlayerId,
    eliminatedPlayerIds,
    eliminations,
  };
}

/**
 * Assassin multi-attack — rules spec §4, backlog L4-05.
 * All-or-nothing: validate fully before paying or queuing.
 */
function playMultipleAttacksAction(
  state: GameState,
  actorPlayerId: string,
  attacks: readonly { instanceId: string; targetPlayerId: string }[],
  rng: Rng,
  nowMs: number,
): TurnRejection | { ok: true; actionPlayed: ActionPlayedEvent } {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  if (!getKit(actor.kitId).traits.allowsMultipleAttacksPerTurn) {
    return { ok: false, message: 'Your kit cannot play multiple attacks in one turn.' };
  }

  if (attacks.length < 2) {
    return { ok: false, message: 'Select at least two attacks.' };
  }

  const seenIds = new Set<string>();

  for (const attack of attacks) {
    if (seenIds.has(attack.instanceId)) {
      return { ok: false, message: 'Duplicate attack selection.' };
    }

    seenIds.add(attack.instanceId);
  }

  interface PreparedAttack {
    instance: CardInstance;
    targetPlayerId: string;
    playPoints: number;
  }

  const prepared: PreparedAttack[] = [];
  let totalCost = 0;

  for (const attack of attacks) {
    const instance = actor.hand.find((card) => card.instanceId === attack.instanceId);

    if (instance === undefined) {
      return { ok: false, message: 'You do not hold that card.' };
    }

    if (!isSharedAttackCardId(instance.cardId)) {
      return { ok: false, message: 'Only attack cards can be multi-played.' };
    }

    const target = findPlayer(state, attack.targetPlayerId);

    if (target === undefined || target.isEliminated || target.id === actorPlayerId) {
      return { ok: false, message: 'Invalid target.' };
    }

    const handler = findHandler(instance.cardId);

    if (handler === undefined) {
      return { ok: false, message: 'That card is not playable yet.' };
    }

    const context = {
      state,
      sourcePlayerId: actorPlayerId,
      targetPlayerId: attack.targetPlayerId,
      card: instance,
      quantity: null,
      rng,
      nowMs,
    };

    if (!handler.canPlay(context)) {
      return { ok: false, message: 'That play is not legal.' };
    }

    const playPoints = playPointsCost(instance.cardId);
    totalCost += playPoints;
    prepared.push({
      instance,
      targetPlayerId: attack.targetPlayerId,
      playPoints,
    });
  }

  if (actor.points < totalCost) {
    return { ok: false, message: 'Not enough points.' };
  }

  const publicAttacks: { cardId: CardId; targetPlayerId: string; isUpgraded: boolean }[] = [];

  for (const entry of prepared) {
    if (entry.playPoints > 0) {
      actor.points -= entry.playPoints;
      actor.turnLedger.pointsSpent += entry.playPoints;
    }

    const handler = findHandler(entry.instance.cardId);

    if (handler === undefined) {
      return { ok: false, message: 'That card is not playable yet.' };
    }

    handler.play({
      state,
      sourcePlayerId: actorPlayerId,
      targetPlayerId: entry.targetPlayerId,
      card: entry.instance,
      quantity: null,
      rng,
      nowMs,
    });

    publicAttacks.push({
      cardId: entry.instance.cardId,
      targetPlayerId: entry.targetPlayerId,
      isUpgraded: entry.instance.isUpgraded,
    });
  }

  return {
    ok: true,
    actionPlayed: {
      actorPlayerId,
      action: 'playMultipleAttacks',
      attacks: publicAttacks,
      turnSequence: state.turnSequence,
    },
  };
}

function playCardAction(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
  targetPlayerId: string | undefined,
  quantity: number | undefined,
  rng: Rng,
  nowMs: number,
): TurnResult | TurnRejection | { ok: true; actionPlayed: ActionPlayedEvent } {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const handIndex = actor.hand.findIndex((card) => card.instanceId === instanceId);
  const specialIndex = actor.specialCards.findIndex((card) => card.instanceId === instanceId);
  const fromSpecials = handIndex < 0 && specialIndex >= 0;

  if (handIndex < 0 && specialIndex < 0) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const instance = fromSpecials
    ? actor.specialCards[specialIndex]
    : actor.hand[handIndex];

  if (instance === undefined) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const cardId = instance.cardId;
  const handler = findHandler(cardId);

  if (handler === undefined) {
    return { ok: false, message: 'That card is not playable yet.' };
  }

  let resolvedTargetId: string | null = null;

  if (targetPlayerId !== undefined) {
    const target = findPlayer(state, targetPlayerId);

    if (target === undefined || target.isEliminated || target.id === actorPlayerId) {
      return { ok: false, message: 'Invalid target.' };
    }

    resolvedTargetId = targetPlayerId;
  }

  const context = {
    state,
    sourcePlayerId: actorPlayerId,
    targetPlayerId: resolvedTargetId,
    card: instance,
    quantity: quantity ?? null,
    rng,
    nowMs,
  };

  if (!handler.canPlay(context)) {
    return { ok: false, message: 'That play is not legal.' };
  }

  // Play payment: points from catalog (shared or special Price). Life / pointsPerLife
  // play costs land with their handlers (Tax, Regeneration). Shared with listLegalActions
  // (technical spec v3 §4.3 rule 4).
  if (!canAffordPlayPoints(actor, cardId)) {
    return { ok: false, message: 'Not enough points.' };
  }

  const playPoints = playPointsCost(cardId);

  if (playPoints > 0) {
    actor.points -= playPoints;
    actor.turnLedger.pointsSpent += playPoints;
  }

  // Attack and action cards are reusable; specials are single-use (rules spec §5).
  handler.play(context);

  if (fromSpecials) {
    actor.specialCards = actor.specialCards.filter((card) => card.instanceId !== instanceId);

    // Persistent specials stay active via activePersistentEffects until deactivated.
    if (!isPersistentSpecialCardId(cardId)) {
      state.pool.push(instance);
    }
  }

  return {
    ok: true,
    actionPlayed: {
      actorPlayerId,
      action: 'playCard',
      cardId,
      isUpgraded: instance.isUpgraded,
      ...(resolvedTargetId !== null ? { targetPlayerId: resolvedTargetId } : {}),
      turnSequence: state.turnSequence,
    },
  };
}

function toResolvedEvents(resolved: ResolvedEffect[]): ActionResolvedEvent[] {
  return resolved.map((entry) => ({
    effectId: entry.effect.id,
    sourcePlayerId: entry.effect.sourcePlayerId,
    targetPlayerId: entry.effect.targetPlayerId,
    cardId: entry.effect.cardId,
    isUpgraded: entry.effect.isUpgraded,
    livesLost: entry.livesLost,
    shieldAbsorbed: entry.shieldAbsorbed,
    outcome: entry.outcome,
  }));
}

/**
 * Elimination at 0 lives is handled by `processEliminations` (Lot 6).
 */

function findWinner(state: GameState): string | null {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length === 1) {
    return alive[0]?.id ?? null;
  }

  return null;
}
