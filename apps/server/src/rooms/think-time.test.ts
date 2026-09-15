import { describe, expect, it } from 'vitest';

import { ThinkTimeAccumulator } from './think-time';

describe('ThinkTimeAccumulator (L60-04)', () => {
  it('credits elapsed wall-clock on close', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 1_000);
    clock.creditAndClose(4_000);

    expect(clock.snapshot().get('alice')).toBe(3_000);
  });

  it('does not double-count a paused segment after resume', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 0);
    clock.pause('alice', 1_000);
    clock.start('alice', 5_000);
    clock.creditAndClose(6_000);

    expect(clock.snapshot().get('alice')).toBe(2_000);
  });

  it('does not count the disconnected gap when crediting while paused', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 0);
    clock.pause('alice', 800);
    clock.creditAndClose(5_000);

    expect(clock.snapshot().get('alice')).toBe(800);
  });

  it('ignores pause for a seat that does not own the open clock', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 0);
    clock.pause('bob', 500);
    clock.creditAndClose(1_000);

    expect(clock.snapshot().get('alice')).toBe(1_000);
    expect(clock.snapshot().get('bob')).toBeUndefined();
  });

  it('credits the previous seat when another seat starts thinking', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 0);
    clock.start('bob', 400);
    clock.creditAndClose(700);

    expect(clock.snapshot().get('alice')).toBe(400);
    expect(clock.snapshot().get('bob')).toBe(300);
  });

  it('returns 0 for a seat that never thought (missing map entry)', () => {
    const clock = new ThinkTimeAccumulator();
    expect(clock.snapshot().get('alice') ?? 0).toBe(0);
  });

  it('clear wipes totals and the open segment', () => {
    const clock = new ThinkTimeAccumulator();
    clock.start('alice', 0);
    clock.creditAndClose(50);
    clock.start('bob', 50);
    clock.clear();

    expect(clock.snapshot().size).toBe(0);
    clock.creditAndClose(200);
    expect(clock.snapshot().size).toBe(0);
  });

  it('creditAndClose with nothing open is a no-op', () => {
    const clock = new ThinkTimeAccumulator();
    clock.creditAndClose(999);
    expect(clock.snapshot().size).toBe(0);
  });
});
