/**
 * Weighted Gambler Draw payout — rules spec §4, designer 2026-09-21 / L64-03.
 */

import { describe, expect, it } from 'vitest';

import { scriptedRng } from '../../testing/factories';
import { createRng } from '../rng';
import { sampleWeightedDrawGain } from './sample-draw-gain';

describe('sampleWeightedDrawGain (L64-03)', () => {
  it('maps ticket 0 to 5 and the last ticket to 100', () => {
    expect(sampleWeightedDrawGain(scriptedRng([0]))).toBe(5);
    expect(sampleWeightedDrawGain(scriptedRng([4655]))).toBe(100);
  });

  it('rolls 5 more often than 50, and 50 more often than 100', () => {
    const rng = createRng('l64-03-draw-gain-weights');
    const counts = { five: 0, fifty: 0, hundred: 0 };

    for (let index = 0; index < 20_000; index += 1) {
      const gain = sampleWeightedDrawGain(rng);
      if (gain === 5) {
        counts.five += 1;
      } else if (gain === 50) {
        counts.fifty += 1;
      } else if (gain === 100) {
        counts.hundred += 1;
      }
    }

    expect(counts.five).toBeGreaterThan(counts.fifty);
    expect(counts.fifty).toBeGreaterThan(counts.hundred);
  });
});
