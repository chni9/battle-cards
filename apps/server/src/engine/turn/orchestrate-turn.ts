/**
 * Shared act → Mirror → reward sequencing — technical spec v3 §8 / §10.3 (L18-03).
 *
 * Room bot path and the headless simulator both call this so the sequence exists once.
 * Policy / transport stay outside: callers supply sub-choice hooks.
 */

import type { GameState, RewardChoice } from '@card-battle/shared';

import type { Rng } from '../rng';
import { createRng } from '../rng';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  performTurnAction,
  type EliminationRewardTurnResult,
  type PerformActionResult,
  type TurnAction,
  type TurnResult,
} from './perform-action';

export interface MirrorResolvePick {
  pendingEffectId: string;
  newTargetPlayerId: string;
}

export interface RewardResolvePick {
  chooserPlayerId: string;
  eliminationId: string;
  choices: readonly [RewardChoice, RewardChoice];
}

export interface TurnSubChoiceHooks {
  resolveMirror(state: GameState, actorPlayerId: string): MirrorResolvePick;
  resolveReward(state: GameState): RewardResolvePick;
}

export interface PerformAndCompleteOptions {
  rng?: Rng;
  nowMs?: number;
  /** Fired after each successful turn-shaped engine result (action or Mirror). */
  onTurnResult?: (result: TurnResult) => void;
  /** Fired after each successful elimination-reward completion. */
  onRewardResult?: (result: Extract<EliminationRewardTurnResult, { ok: true }>) => void;
}

/**
 * Perform `action`, then resolve Mirror and reward sub-choices synchronously via hooks
 * until the turn can advance (or the game ends).
 */
export function performAndCompleteTurn(
  state: GameState,
  actorPlayerId: string,
  action: TurnAction,
  hooks: TurnSubChoiceHooks,
  options: PerformAndCompleteOptions = {},
): PerformActionResult {
  const nowMs = options.nowMs ?? Date.now();
  const rng = options.rng ?? createRng(`${state.seed}:turn:${state.turnSequence}`);
  const result = performTurnAction(state, actorPlayerId, action, rng, nowMs);

  if (!result.ok) {
    return result;
  }

  options.onTurnResult?.(result);
  return continuePendingSubChoices(state, actorPlayerId, result, hooks, nowMs, {
    ...options,
    rng,
  });
}

/**
 * Continue Mirror / reward loops from an already-applied successful turn result.
 */
export function continuePendingSubChoices(
  state: GameState,
  actorPlayerId: string,
  initial: TurnResult,
  hooks: TurnSubChoiceHooks,
  nowMs: number = Date.now(),
  options: Pick<PerformAndCompleteOptions, 'onTurnResult' | 'onRewardResult' | 'rng'> = {},
): TurnResult | { ok: false; message: string } {
  let result: TurnResult = initial;
  const rng = options.rng ?? createRng(`${state.seed}:turn:${state.turnSequence}`);

  while (result.mirrorChoicePending === true) {
    const pick = hooks.resolveMirror(state, actorPlayerId);
    const mirrorResult = completeMirrorChoice(
      state,
      actorPlayerId,
      pick.pendingEffectId,
      pick.newTargetPlayerId,
      rng,
      nowMs,
    );

    if (!mirrorResult.ok) {
      return mirrorResult;
    }

    options.onTurnResult?.(mirrorResult);
    result = mirrorResult;
  }

  while (result.rewardChoicePending === true) {
    const pick = hooks.resolveReward(state);
    const rewardResult = completeEliminationRewardChoice(
      state,
      pick.chooserPlayerId,
      pick.eliminationId,
      pick.choices,
      nowMs,
    );

    if (!rewardResult.ok) {
      return { ok: false, message: rewardResult.message };
    }

    options.onRewardResult?.(rewardResult);

    result = {
      ok: true,
      actionPlayed: result.actionPlayed,
      resolved: [],
      winnerPlayerId: rewardResult.winnerPlayerId,
      eliminatedPlayerIds: [],
      eliminations: [],
      rewardChoicePending: rewardResult.rewardChoicePending,
    };
  }

  return result;
}
