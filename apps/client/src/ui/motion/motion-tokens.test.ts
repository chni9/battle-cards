import type { Transition } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { CARD_SPRING, DUR_BASE_MS, DUR_FAST_MS, DUR_SLOW_MS, durationS, EASE_ENTRANCE, V7_DURATIONS_MS } from './motion-tokens';

describe('V7 motion tokens (technical spec v7 §5.7)', () => {
  it('pins the three durations in milliseconds', () => {
    expect([DUR_FAST_MS, DUR_BASE_MS, DUR_SLOW_MS]).toEqual([120, 220, 400]);
    expect(V7_DURATIONS_MS).toEqual({ fast: 120, base: 220, slow: 400 });
  });
  it('converts durations to motion seconds', () => {
    expect(durationS('fast')).toBeCloseTo(0.12, 10);
    expect(durationS('base')).toBeCloseTo(0.22, 10);
    expect(durationS('slow')).toBeCloseTo(0.4, 10);
  });
  it('pins the card spring and the entrance ease-out', () => {
    expect(CARD_SPRING).toEqual({ type: 'spring', stiffness: 400, damping: 28 });
    expect(EASE_ENTRANCE).toEqual([0.16, 1, 0.3, 1]);
  });
  it('types as motion Transitions', () => {
    const spring: Transition = CARD_SPRING;
    const entrance: Transition = { duration: durationS('base'), ease: EASE_ENTRANCE };
    expect([spring, entrance]).toHaveLength(2);
  });
});
