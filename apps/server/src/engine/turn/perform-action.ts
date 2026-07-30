/**
 * Turn actions — draw, play, buy, sell.
 * Technical spec §4.3, §5.2, §5.4 · rules spec §1, §2, §6 · backlog L2-01.
 */

import {
  ATTACK_CARD_IDS,
  getCard,
  getKit,
  isPersistentSpecialCardId,
  type AttackCardId,
  type CardId,
  type CardInstance,
  type GameState,
} from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { buyCard } from '../economy/buy-card';
import { sellCard } from '../economy/sell-card';
import { upgradeCard } from '../economy/upgrade-card';
import { buyUpgradePoint, sellUpgradePoint } from '../economy/upgrade-points';
import type { Rng } from '../rng';
import { advanceTurn, findPlayer } from './advance-turn';
import {
  applyDefaultMirrorRedirect,
  redirectPendingAttack,
} from './mirror-choice';
import { resolvePendingEffects, type ResolvedEffect } from './resolve-pending';

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
  | { type: 'sellUpgradePoint' };

export type PublicActionKind =
  | 'draw'
  | 'playCard'
  | 'playMultipleAttacks'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint';

export interface ActionPlayedEvent {
  actorPlayerId: string;
  action: PublicActionKind;
  cardId?: CardId;
  targetPlayerId?: string;
  attacks?: readonly { cardId: CardId; targetPlayerId: string }[];
  turnSequence: number;
}

export interface ActionResolvedEvent {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: 'applied' | 'immune' | 'cancelled';
}

export interface TurnResult {
  ok: true;
  actionPlayed: ActionPlayedEvent;
  resolved: ActionResolvedEvent[];
  /** Set when exactly one non-eliminated player remains after this turn. */
  winnerPlayerId: string | null;
  eliminatedPlayerIds: string[];
  /** True when Mirror paid and is waiting for chooseMirrorTarget / default. */
  mirrorChoicePending?: boolean;
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
): PerformActionResult {
  if (state.currentTurnPlayerId !== actorPlayerId) {
    return { ok: false, message: 'It is not your turn.' };
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined || actor.isEliminated) {
    return { ok: false, message: 'You are not an active player.' };
  }

  let actionPlayed: ActionPlayedEvent;

  if (action.type === 'draw') {
    actor.points += getKit(actor.kitId).startingResources.draw;
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
  } else if (action.type === 'playMultipleAttacks') {
    const multi = playMultipleAttacksAction(state, actorPlayerId, action.attacks);

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
    );

    if (!playResult.ok) {
      return playResult;
    }

    actionPlayed = playResult.actionPlayed;
  }

  // Mirror starts a sub-choice: paid, but resolve/advance wait for chooseMirrorTarget.
  if (state.mirrorChoice !== null) {
    return {
      ok: true,
      actionPlayed,
      resolved: [],
      winnerPlayerId: null,
      eliminatedPlayerIds: [],
      mirrorChoicePending: true,
    };
  }

  return finishTurnPhases(state, actorPlayerId, actionPlayed);
}

/**
 * Complete a Mirror redirect then finish the Mirror user's turn (resolve + advance).
 */
export function completeMirrorChoice(
  state: GameState,
  actorPlayerId: string,
  pendingEffectId: string,
  newTargetPlayerId: string,
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

  state.mirrorChoice = null;

  return finishTurnPhases(state, actorPlayerId, {
    actorPlayerId,
    action: 'playCard',
    cardId: 'mirror',
    turnSequence: state.turnSequence,
  });
}

/**
 * Apply Mirror default redirect on sub-choice expiry, then finish the turn.
 */
export function expireMirrorChoice(state: GameState, rng: Rng): PerformActionResult {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return { ok: false, message: 'No Mirror choice pending.' };
  }

  const actorPlayerId = choice.playerId;
  const applied = applyDefaultMirrorRedirect(state, rng);

  if (!applied.ok) {
    return applied;
  }

  state.mirrorChoice = null;

  return finishTurnPhases(state, actorPlayerId, {
    actorPlayerId,
    action: 'playCard',
    cardId: 'mirror',
    turnSequence: state.turnSequence,
  });
}

function finishTurnPhases(
  state: GameState,
  actorPlayerId: string,
  actionPlayed: ActionPlayedEvent,
): TurnResult {
  const resolvedEffects = resolvePendingEffects(state, actorPlayerId);
  const eliminatedPlayerIds = markEliminations(state);
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
  };
}

function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}

/**
 * Assassin multi-attack — rules spec §4, backlog L4-05.
 * All-or-nothing: validate fully before paying or queuing.
 */
function playMultipleAttacksAction(
  state: GameState,
  actorPlayerId: string,
  attacks: readonly { instanceId: string; targetPlayerId: string }[],
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

    if (!isAttackCardId(instance.cardId)) {
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
    };

    if (!handler.canPlay(context)) {
      return { ok: false, message: 'That play is not legal.' };
    }

    const definition = getCard(instance.cardId);
    const playPoints = definition?.cost.points ?? 0;
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

  const publicAttacks: { cardId: CardId; targetPlayerId: string }[] = [];

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
    });

    publicAttacks.push({
      cardId: entry.instance.cardId,
      targetPlayerId: entry.targetPlayerId,
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
  };

  if (!handler.canPlay(context)) {
    return { ok: false, message: 'That play is not legal.' };
  }

  // Play payment: points from catalog (shared or special Price). Life / pointsPerLife
  // play costs land with their handlers (Tax, Regeneration).
  const definition = getCard(cardId);
  const playPoints = definition?.cost.points ?? 0;

  if (actor.points < playPoints) {
    return { ok: false, message: 'Not enough points.' };
  }

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
    livesLost: entry.livesLost,
    shieldAbsorbed: entry.shieldAbsorbed,
    outcome: entry.outcome,
  }));
}

/**
 * Elimination at 0 lives — rules spec §1 / §6. Rewards deferred to lot 6.
 * `eliminatorPlayerId` is recorded only for events; L1 grants no rewards.
 */
function markEliminations(state: GameState): string[] {
  const eliminated: string[] = [];

  for (const player of state.players) {
    if (!player.isEliminated && player.lives <= 0) {
      player.isEliminated = true;
      player.lives = 0;
      state.pool.push(...player.hand, ...player.specialCards);
      player.hand = [];
      player.specialCards = [];
      eliminated.push(player.id);
    }
  }

  return eliminated;
}

function findWinner(state: GameState): string | null {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length === 1) {
    return alive[0]?.id ?? null;
  }

  return null;
}
