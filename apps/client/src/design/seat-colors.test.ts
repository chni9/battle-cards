import { describe, expect, it } from 'vitest';

import {
  clampSeatIndex,
  seatColorVar,
  seatIndexOf,
  seatNameStyle,
  seatZoneStyle,
} from './seat-colors';

const view = {
  players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
};

describe('seatIndexOf (L39-03)', () => {
  it('returns view.players array index, not an invented order', () => {
    expect(seatIndexOf(view, 'a')).toBe(0);
    expect(seatIndexOf(view, 'b')).toBe(1);
    expect(seatIndexOf(view, 'c')).toBe(2);
    expect(seatIndexOf(view, 'd')).toBe(3);
  });

  it('returns null for unknown ids', () => {
    expect(seatIndexOf(view, 'missing')).toBeNull();
  });

  it('returns null when index would exceed the 4-seat palette', () => {
    const five = {
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
    };
    expect(seatIndexOf(five, 'e')).toBeNull();
  });
});

describe('seatColorVar / styles (L39-03)', () => {
  it('clamps out-of-range indices into the palette', () => {
    expect(clampSeatIndex(-1)).toBe(0);
    expect(clampSeatIndex(99)).toBe(3);
    expect(seatColorVar(2)).toBe('var(--color-seat-2)');
  });

  it('builds tint and name styles from CSS vars', () => {
    expect(seatNameStyle(1)).toEqual({ color: 'var(--color-seat-1)' });
    const zone = seatZoneStyle(0);
    expect(zone.borderColor).toBe('var(--color-seat-0)');
    expect(zone.backgroundColor).toContain('var(--color-seat-0)');
    expect(zone.backgroundColor).toContain('22%');
    expect(zone.boxShadow).toContain('var(--color-seat-0)');
    expect(zone.boxShadow).not.toContain('0 0 0 3px');
  });

  it('uses a stronger wash for the POV dock fill', () => {
    const dock = seatZoneStyle(3, { intensity: 'fill' });
    expect(dock.backgroundColor).toContain('var(--color-seat-3)');
    expect(dock.backgroundColor).toContain('28%');
  });

  it('adds seat-colored glow when the seat is active (L39-05)', () => {
    const zone = seatZoneStyle(2, { active: true });
    expect(zone.boxShadow).toContain('var(--color-seat-2)');
    expect(zone.boxShadow).toContain('0 0 0 3px');
    expect(zone.boxShadow).toContain('0 0 28px');
  });
});
