import { describe, expect, it } from 'vitest';

import { binomialTailPValueGe } from './binomial-test';

describe('binomialTailPValueGe', () => {
  it('is ~0.5 for k = n/2 at p0=0.5', () => {
    const p = binomialTailPValueGe(50, 100, 0.5);
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
  });

  it('is small when wins dominate', () => {
    const p = binomialTailPValueGe(60, 100, 0.5);
    expect(p).toBeLessThan(0.05);
  });

  it('is 1 when successes is 0', () => {
    expect(binomialTailPValueGe(0, 100, 0.5)).toBe(1);
  });

  it('does not underflow on large fair samples near 0.5', () => {
    const p = binomialTailPValueGe(794, 1550, 0.5);
    expect(p).toBeGreaterThan(0.1);
    expect(p).toBeLessThan(0.5);
  });

  it('rejects a clear edge at n=2000', () => {
    const p = binomialTailPValueGe(1060, 2000, 0.5);
    expect(p).toBeLessThan(0.01);
  });
});
