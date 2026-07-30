/**
 * Turn actions — draw, play, buy, sell.
 * Technical spec §4.3, §5.2, §5.4 · rules spec §1, §2, §6 · backlog L2-01.
 */

import { getSharedCard, type CardId, type GameState } from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { buyCard } from '../economy/buy-card';
import { sellCard } from '../economy/sell-card';
import { upgradeCard } from '../economy/upgrade-card';
import { buyUpgradePoint, sellUpgradePoint } from '../economy/upgrade-points';
import { L1_PLACEHOLDER_RESOURCES } from '../l1-placeholders';
import { advanceTurn, findPlayer } from './advance-turn';
import { resolvePendingEffects, type ResolvedEffect } from './resolve-pending';

export type TurnAction =
  | { type: 'draw' }
  | { type: 'playCard'; instanceId: string; targetPlayerId: string }
  | { type: 'buyCard'; cardId: CardId }
  | { type: 'sellCard'; instanceId: string }
  | { type: 'upgradeCard'; instanceId: string }
  | { type: 'buyUpgradePoint' }
  | { type: 'sellUpgradePoint' };

export type PublicActionKind =
  | 'draw'
  | 'playCard'
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
  turnSequence: number;
}

export interface ActionResolvedEvent {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  livesLost: number;
  shieldAbsorbed: number;
}

export interface TurnResult {
  ok: true;
  actionPlayed: ActionPlayedEvent;
  resolved: ActionResolvedEvent[];
  /** Set when exactly one non-eliminated player remains after this turn. */
  winnerPlayerId: string | null;
  eliminatedPlayerIds: string[];
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
    actor.points += L1_PLACEHOLDER_RESOURCES.draw;
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
  } else {
    const playResult = playCardAction(
      state,
      actorPlayerId,
      action.instanceId,
      action.targetPlayerId,
    );

    if (!playResult.ok) {
      return playResult;
    }

    actionPlayed = playResult.actionPlayed;
  }

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

function playCardAction(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
  targetPlayerId: string,
): TurnResult | TurnRejection | { ok: true; actionPlayed: ActionPlayedEvent } {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const instanceIndex = actor.hand.findIndex((card) => card.instanceId === instanceId);

  if (instanceIndex < 0) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const instance = actor.hand[instanceIndex];

  if (instance === undefined) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const cardId = instance.cardId;
  const handler = findHandler(cardId);

  if (handler === undefined) {
    return { ok: false, message: 'That card is not playable yet.' };
  }

  const target = findPlayer(state, targetPlayerId);

  if (target === undefined || target.isEliminated || target.id === actorPlayerId) {
    return { ok: false, message: 'Invalid target.' };
  }

  const context = {
    state,
    sourcePlayerId: actorPlayerId,
    targetPlayerId,
    card: instance,
  };

  if (!handler.canPlay(context)) {
    return { ok: false, message: 'That play is not legal.' };
  }

  // Play payment: points from catalog. Life / pointsPerLife play costs land with
  // their handlers (Tax, Regeneration) — shop life transfers use payCost instead.
  const definition = getSharedCard(cardId);
  const playPoints = definition?.cost.points ?? 0;

  if (actor.points < playPoints) {
    return { ok: false, message: 'Not enough points.' };
  }

  if (playPoints > 0) {
    actor.points -= playPoints;
    actor.turnLedger.pointsSpent += playPoints;
  }

  actor.hand.splice(instanceIndex, 1);
  handler.play(context);

  return {
    ok: true,
    actionPlayed: {
      actorPlayerId,
      action: 'playCard',
      cardId,
      targetPlayerId,
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
