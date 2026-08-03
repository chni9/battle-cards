/**
 * Difficulty noise — technical spec v3 §4.5 (L16-05).
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng';
import type { TurnAction } from '../engine/turn/perform-action';
import {
  applyDifficultyNoise,
  DIFFICULTY_RANDOM_RATES,
  rollDifficultyNoise,
} from './difficulty-noise';

const actions: readonly TurnAction[] = [
  { type: 'draw' },
  { type: 'buyUpgradePoint' },
  { type: 'buySpecialCard' },
];

const top: TurnAction = { type: 'draw' };

describe('applyDifficultyNoise (L16-05)', () => {
  it('hard never substitutes', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(rollDifficultyNoise('hard', createRng(`hard-roll-${index}`))).toBe(false);
      expect(applyDifficultyNoise(top, actions, 'hard', createRng(`hard-${index}`))).toEqual(top);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = applyDifficultyNoise(top, actions, 'easy', createRng('noise-det'));
    const b = applyDifficultyNoise(top, actions, 'easy', createRng('noise-det'));
    expect(a).toEqual(b);
  });

  it('easy substitutes at approximately 0.55 over a large sample', () => {
    expect(DIFFICULTY_RANDOM_RATES.easy).toBe(0.55);
    let hits = 0;
    const samples = 2000;

    for (let index = 0; index < samples; index += 1) {
      if (rollDifficultyNoise('easy', createRng(`easy-rate-${index}`))) {
        hits += 1;
      }
    }

    const rate = hits / samples;
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThan(0.6);
  });

  it('when noise fires, the result is always a legal action', () => {
    for (let index = 0; index < 100; index += 1) {
      const pick = applyDifficultyNoise(top, actions, 'easy', createRng(`legal-${index}`));
      expect(actions).toContainEqual(pick);
    }
  });
});
