/**
 * Difficulty as seeded noise — technical spec v3 §4.5 (L16-05).
 *
 * One axis: probability of substituting a uniform random legal action for the
 * top-scored pick. No tier reads extra information (decision 2).
 */

import type { BotDifficulty } from '@card-battle/shared';

import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';

/** Tunable defaults — technical spec v3 §4.5. */
export const DIFFICULTY_RANDOM_RATES: Readonly<Record<BotDifficulty, number>> = {
  easy: 0.55,
  normal: 0.2,
  hard: 0,
};

export interface DifficultyNoiseResult {
  action: TurnAction;
  substituted: boolean;
}

/** Whether this decision substitutes a random legal action (seeded). */
export function rollDifficultyNoise(difficulty: BotDifficulty, rng: Rng): boolean {
  const rate = DIFFICULTY_RANDOM_RATES[difficulty];

  if (rate <= 0) {
    return false;
  }

  return rng.nextInt(1_000_000) / 1_000_000 < rate;
}

export function applyDifficultyNoise(
  topAction: TurnAction,
  actions: readonly TurnAction[],
  difficulty: BotDifficulty,
  rng: Rng,
): TurnAction {
  return applyDifficultyNoiseWithMeta(topAction, actions, difficulty, rng).action;
}

export function applyDifficultyNoiseWithMeta(
  topAction: TurnAction,
  actions: readonly TurnAction[],
  difficulty: BotDifficulty,
  rng: Rng,
): DifficultyNoiseResult {
  if (actions.length === 0) {
    throw new RangeError('applyDifficultyNoise received an empty action list');
  }

  if (!rollDifficultyNoise(difficulty, rng)) {
    return { action: topAction, substituted: false };
  }

  return { action: rng.pick(actions), substituted: true };
}
