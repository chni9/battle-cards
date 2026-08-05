/**
 * Life-relative heuristic thresholds — technical spec v3 §4.4 (L29-03).
 */

import { describe, expect, it } from 'vitest';

import { regenSoftLifeForKit, taxLifeBufferForKit } from './heuristic-life-thresholds';

describe('regenSoftLifeForKit / taxLifeBufferForKit (L29-03)', () => {
  it.each([
    { startingLives: 10, regen: 6, tax: 5 },
    { startingLives: 18, regen: 11, tax: 5 },
    { startingLives: 1, regen: 1, tax: 1 },
    { startingLives: 14, regen: 8, tax: 5 },
  ])(
    '$startingLives starting lives → regen soft $regen, tax buffer $tax',
    ({ startingLives, regen, tax }) => {
      expect(regenSoftLifeForKit(startingLives)).toBe(regen);
      expect(taxLifeBufferForKit(startingLives)).toBe(tax);
    },
  );

  it('never returns below 1 for either threshold', () => {
    expect(regenSoftLifeForKit(1)).toBeGreaterThanOrEqual(1);
    expect(taxLifeBufferForKit(1)).toBeGreaterThanOrEqual(1);
  });

  it('caps the Tax buffer at the 10-life tuned value, never scaling it up', () => {
    // A high-life kit should Tax more readily than a 10-life kit, not need a bigger cushion.
    expect(taxLifeBufferForKit(18)).toBeLessThanOrEqual(taxLifeBufferForKit(10));
  });
});
