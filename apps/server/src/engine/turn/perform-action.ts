/**
 * Turn actions for Lot 1 — draw and play basic attack.
 * Technical spec §4.3, §5.2, §5.4 · rules spec §2, §6.
 */

import type { CardId, GameState } from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { L1_PLACEHOLDER_RESOURCES } from '../l1-placeholders';
import { advanceTurn, findPlayer } from './advance-turn';
import { resolvePendingEffects, type ResolvedEffect } from './resolve-pending';

export type TurnAction =
  | { type: 'draw' }
  | { type: 'playCard'; cardId: CardId; targetPlayerId: string };

export interface ActionPlayedEvent {
  actorPlayerId: string;
  action: 'draw' | 'playCard';
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
  } else {
    const playResult = playCardAction(state, actorPlayerId, action.cardId, action.targetPlayerId);

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
  cardId: CardId,
  targetPlayerId: string,
): TurnResult | TurnRejection | { ok: true; actionPlayed: ActionPlayedEvent } {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const handler = findHandler(cardId);

  if (handler === undefined) {
    return { ok: false, message: 'That card is not playable yet.' };
  }

  const instanceIndex = actor.hand.findIndex((card) => card.cardId === cardId);

  if (instanceIndex < 0) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const instance = actor.hand[instanceIndex];

  if (instance === undefined) {
    return { ok: false, message: 'You do not hold that card.' };
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

  // Cost for basic attack — rules spec §2. Paid before the handler queues the effect.
  const costPoints = cardId === 'basic-attack' ? 1 : 0;

  if (actor.points < costPoints) {
    return { ok: false, message: 'Not enough points.' };
  }

  actor.points -= costPoints;
  actor.turnLedger.pointsSpent += costPoints;
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
