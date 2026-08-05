/**
 * Shared act → Mirror → reward sequencing — technical spec v3 §8 / §10.3 (L18-03).
 *
 * Room bot path and the headless simulator both call this so the sequence exists once.
 * Policy / transport stay outside: callers supply sub-choice hooks.
 */

import type { GameState, RewardChoice, SpecialCardId } from '@card-battle/shared';

import type { Rng } from '../rng';
import { createRng } from '../rng';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  completePoolPick,
  completeSpecialPick,
  completeStealChoice,
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

export interface StealResolvePick {
  instanceId: string;
}

export interface PoolResolvePick {
  instanceIds: readonly string[];
}

export interface SpecialResolvePick {
  cardId: SpecialCardId;
}

export interface RewardResolvePick {
  chooserPlayerId: string;
  eliminationId: string;
  choices: readonly [RewardChoice, RewardChoice];
}

export interface TurnSubChoiceHooks {
  resolveMirror(state: GameState, actorPlayerId: string): MirrorResolvePick;
  /**
   * Return a steal instance id, or `null` to leave stealChoice pending for an
   * external handler (human UI / room timer). Headless bots always return a pick.
   */
  resolveSteal?(state: GameState, actorPlayerId: string): StealResolvePick | null;
  /**
   * Return pool instance ids, or `null` to leave `subChoice` pending for an
   * external handler. Headless bots always return a pick.
   */
  resolvePoolPick?(state: GameState, actorPlayerId: string): PoolResolvePick | null;
  /**
   * Return a special card id, or `null` to leave `subChoice` pending.
   */
  resolveSpecialPick?(state: GameState, actorPlayerId: string): SpecialResolvePick | null;
  /**
   * Return picks to complete the active reward job, or `null` to leave
   * `rewardChoice` pending for an external handler (human UI / room timer).
   * Headless bots always return picks; the Colyseus room returns null for humans.
   */
  resolveReward(state: GameState): RewardResolvePick | null;
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

  // One loop over both sub-choice kinds (technical spec v4 §4.4 — replaces two
  // hardcoded `while`s). `mirrorChoicePending` and `rewardChoicePending` are never
  // both true on the same result — Mirror always finishes before any reward can be
  // enqueued from the same `finishTurnPhases` call — so checking Mirror first and
  // falling through to rewards is equivalent to draining each independently.
  while (
    result.mirrorChoicePending === true ||
    result.stealChoicePending === true ||
    result.subChoicePending === true ||
    result.rewardChoicePending === true
  ) {
    if (result.mirrorChoicePending === true) {
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
      continue;
    }

    if (result.stealChoicePending === true) {
      const pick = hooks.resolveSteal?.(state, actorPlayerId) ?? null;

      if (pick === null) {
        return result;
      }

      const stealResult = completeStealChoice(
        state,
        actorPlayerId,
        pick.instanceId,
        rng,
        nowMs,
      );

      if (!stealResult.ok) {
        return stealResult;
      }

      options.onTurnResult?.(stealResult);
      result = stealResult;
      continue;
    }

    if (result.subChoicePending === true) {
      const kind = state.subChoice?.kind;

      if (kind === 'pool-pick') {
        const pick = hooks.resolvePoolPick?.(state, actorPlayerId) ?? null;

        if (pick === null) {
          return result;
        }

        const poolResult = completePoolPick(
          state,
          actorPlayerId,
          pick.instanceIds,
          rng,
          nowMs,
        );

        if (!poolResult.ok) {
          return poolResult;
        }

        options.onTurnResult?.(poolResult);
        result = poolResult;
        continue;
      }

      if (kind === 'special-pick') {
        const pick = hooks.resolveSpecialPick?.(state, actorPlayerId) ?? null;

        if (pick === null) {
          return result;
        }

        const specialResult = completeSpecialPick(
          state,
          actorPlayerId,
          pick.cardId,
          rng,
          nowMs,
        );

        if (!specialResult.ok) {
          return specialResult;
        }

        options.onTurnResult?.(specialResult);
        result = specialResult;
        continue;
      }

      return result;
    }

    const pick = hooks.resolveReward(state);

    if (pick === null) {
      // Leave rewardChoicePending — caller arms human UI or bot-driver path.
      return result;
    }

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
