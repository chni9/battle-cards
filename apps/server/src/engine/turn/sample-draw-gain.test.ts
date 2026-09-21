/**
 * Truncated-geometric Gambler Draw payout — rules spec §4,
 * designer 2026-09-21 correction.
 */

import { describe, expect, it } from 'vitest';

import { scriptedRng } from '../../testing/factories';
import { createRng } from '../rng';
import { DRAW_GAIN_TICKET_COUNT, sampleWeightedDrawGain } from './sample-draw-gain';

const DRAW_GAIN_SAMPLE_SEED = 'l64-draw-gain-truncated-geometric';
const DRAW_GAIN_SAMPLE_SIZE = 100_000;

describe('sampleWeightedDrawGain (truncated geometric)', () => {
  it('maps ticket 0 to 5 and the last ticket to 100', () => {
    expect(DRAW_GAIN_TICKET_COUNT).toBeGreaterThan(0);
    expect(DRAW_GAIN_TICKET_COUNT).toBeLessThan(2 ** 32);
    expect(sampleWeightedDrawGain(scriptedRng([0]))).toBe(5);
    expect(sampleWeightedDrawGain(scriptedRng([DRAW_GAIN_TICKET_COUNT - 1]))).toBe(100);
  });

  it('puts at most 10% of mass above 20 on a large seeded sample', () => {
    const rng = createRng(DRAW_GAIN_SAMPLE_SEED);
    let above20 = 0;

    for (let index = 0; index < DRAW_GAIN_SAMPLE_SIZE; index += 1) {
      if (sampleWeightedDrawGain(rng) > 20) {
        above20 += 1;
      }
    }

    expect(above20 / DRAW_GAIN_SAMPLE_SIZE).toBeLessThanOrEqual(0.1);
  });

  it('rolls 5 more often than 10, 10 than 20, 20 than 50, 50 than 100', () => {
    const rng = createRng(DRAW_GAIN_SAMPLE_SEED);
    const counts = { five: 0, ten: 0, twenty: 0, fifty: 0, hundred: 0 };

    for (let index = 0; index < DRAW_GAIN_SAMPLE_SIZE; index += 1) {
      const gain = sampleWeightedDrawGain(rng);
      if (gain === 5) {
        counts.five += 1;
      } else if (gain === 10) {
        counts.ten += 1;
      } else if (gain === 20) {
        counts.twenty += 1;
      } else if (gain === 50) {
        counts.fifty += 1;
      } else if (gain === 100) {
        counts.hundred += 1;
      }
    }

    expect(counts.five).toBeGreaterThan(counts.ten);
    expect(counts.ten).toBeGreaterThan(counts.twenty);
    expect(counts.twenty).toBeGreaterThan(counts.fifty);
    expect(counts.fifty).toBeGreaterThan(counts.hundred);
  });
});
