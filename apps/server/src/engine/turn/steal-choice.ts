/**
 * Card Thief steal-pick helpers — rules spec §5, backlog L21-03.
 *
 * Mirror-shaped sub-choice: while `stealChoice` is set, the thief has paid and the
 * card is consumed, but pending resolve waits for the pick (or timeout default).
 */

import type { GameState, Player } from '@card-battle/shared';

import { findSpyRelation } from '../../protocol/visibility-matrix';
import type { Rng } from '../rng';
import { findPlayer } from './advance-turn';
import { queueEffect } from './queue-effect';
import { SUB_CHOICE_MS } from './sub-choice';

/** Re-exports the single `SUB_CHOICE_MS` — technical spec v4 §4.4. */
export const STEAL_SUB_CHOICE_MS = SUB_CHOICE_MS;

/** Hand + unused specials — #V4-19. */
export function listStealEligibleInstanceIds(victim: Player): string[] {
  return [
    ...victim.hand.map((card) => card.instanceId),
    ...victim.specialCards.map((card) => card.instanceId),
  ];
}

/** Spy active from the thief onto the victim — #V4-35. */
export function isSpiedByUser(
  state: GameState,
  thiefPlayerId: string,
  victimPlayerId: string,
): boolean {
  return findSpyRelation(state, thiefPlayerId, victimPlayerId) !== undefined;
}

export function beginStealChoice(
  state: GameState,
  input: {
    thiefPlayerId: string;
    victimPlayerId: string;
    pendingSpiedVictimIds: readonly string[];
    cardIsUpgraded: boolean;
    nowMs: number;
  },
): void {
  const victim = findPlayer(state, input.victimPlayerId);

  if (victim === undefined) {
    return;
  }

  const eligible = listStealEligibleInstanceIds(victim);

  if (eligible.length === 0) {
    queueEffect({
      state,
      sourcePlayerId: input.thiefPlayerId,
      targetPlayerId: input.victimPlayerId,
      cardId: 'card-thief',
      isUpgraded: input.cardIsUpgraded,
      chosenInstanceId: null,
    });
    raiseNextOrClear(state, input.thiefPlayerId, input.pendingSpiedVictimIds, input.cardIsUpgraded, input.nowMs);
    return;
  }

  state.stealChoice = {
    playerId: input.thiefPlayerId,
    victimPlayerId: input.victimPlayerId,
    eligibleInstanceIds: eligible,
    pendingSpiedVictimIds: [...input.pendingSpiedVictimIds],
    cardIsUpgraded: input.cardIsUpgraded,
    deadlineMs: input.nowMs + STEAL_SUB_CHOICE_MS,
  };
}

function raiseNextOrClear(
  state: GameState,
  thiefPlayerId: string,
  pendingSpiedVictimIds: readonly string[],
  cardIsUpgraded: boolean,
  nowMs: number,
): boolean {
  const [next, ...rest] = pendingSpiedVictimIds;

  if (next === undefined) {
    state.stealChoice = null;
    return false;
  }

  beginStealChoice(state, {
    thiefPlayerId,
    victimPlayerId: next,
    pendingSpiedVictimIds: rest,
    cardIsUpgraded,
    nowMs,
  });
  return state.stealChoice !== null;
}

/**
 * Apply a steal-pick: queue the locked instance, then raise the next spied victim
 * or clear the slot. Returns whether another steal-pick is still pending.
 */
export function applyStealPick(
  state: GameState,
  instanceId: string,
  nowMs: number,
): { ok: true; stillPending: boolean } | { ok: false; message: string } {
  const choice = state.stealChoice;

  if (choice === null) {
    return { ok: false, message: 'No steal choice pending.' };
  }

  if (!choice.eligibleInstanceIds.includes(instanceId)) {
    return { ok: false, message: 'That card is not available to steal.' };
  }

  queueEffect({
    state,
    sourcePlayerId: choice.playerId,
    targetPlayerId: choice.victimPlayerId,
    cardId: 'card-thief',
    isUpgraded: choice.cardIsUpgraded,
    chosenInstanceId: instanceId,
  });

  const pending = [...choice.pendingSpiedVictimIds];
  const thiefId = choice.playerId;
  const upgraded = choice.cardIsUpgraded;
  state.stealChoice = null;
  const stillPending = raiseNextOrClear(state, thiefId, pending, upgraded, nowMs);

  return { ok: true, stillPending };
}

/** Timeout default: rng among eligible, or queue null if empty. */
export function applyDefaultStealPick(
  state: GameState,
  rng: Rng,
  nowMs: number,
): { ok: true; stillPending: boolean } | { ok: false; message: string } {
  const choice = state.stealChoice;

  if (choice === null) {
    return { ok: false, message: 'No steal choice pending.' };
  }

  if (choice.eligibleInstanceIds.length === 0) {
    queueEffect({
      state,
      sourcePlayerId: choice.playerId,
      targetPlayerId: choice.victimPlayerId,
      cardId: 'card-thief',
      isUpgraded: choice.cardIsUpgraded,
      chosenInstanceId: null,
    });
    const pending = [...choice.pendingSpiedVictimIds];
    const thiefId = choice.playerId;
    const upgraded = choice.cardIsUpgraded;
    state.stealChoice = null;
    const stillPending = raiseNextOrClear(state, thiefId, pending, upgraded, nowMs);
    return { ok: true, stillPending };
  }

  const picked = rng.pick(choice.eligibleInstanceIds);
  return applyStealPick(state, picked, nowMs);
}
