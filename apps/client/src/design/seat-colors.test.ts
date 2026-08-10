import { describe, expect, it } from 'vitest';

import {
  clampSeatIndex,
  seatColorHex,
  seatColorVar,
  seatColorWash,
  seatIndexOf,
  seatNameStyle,
  seatZoneStyle,
  SEAT_COLORS,
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

describe('seatColorHex / styles (L39-03)', () => {
  it('exposes a 4-seat hex palette (blue/red/green/yellow)', () => {
    expect(SEAT_COLORS).toEqual(['#1d6fd8', '#d62828', '#1a9b3c', '#ffd400']);
    expect(seatColorHex(3)).toBe('#ffd400');
    expect(seatColorVar(2)).toBe(SEAT_COLORS[2]);
  });

  it('clamps out-of-range indices into the palette', () => {
    expect(clampSeatIndex(-1)).toBe(0);
    expect(clampSeatIndex(99)).toBe(3);
  });

  it('washes hex over white without color-mix', () => {
    expect(seatColorWash('#ff0000', 0)).toBe('rgb(255, 255, 255)');
    expect(seatColorWash('#ff0000', 1)).toBe('rgb(255, 0, 0)');
  });

  it('builds tint and name styles from hex', () => {
    expect(seatNameStyle(1)).toEqual({ color: '#d62828' });
    const zone = seatZoneStyle(0);
    expect(zone.borderColor).toBe('#1d6fd8');
    expect(zone.backgroundColor).toMatch(/^rgb\(/);
    expect(zone.boxShadow).toContain('#1d6fd8');
    expect(zone.boxShadow).not.toContain('0 0 0 3px');
  });

  it('uses a stronger wash for the POV dock fill', () => {
    const soft = seatZoneStyle(3, { intensity: 'soft' }).backgroundColor;
    const dock = seatZoneStyle(3, { intensity: 'fill' }).backgroundColor;
    expect(dock).not.toEqual(soft);
    expect(dock).toMatch(/^rgb\(/);
  });

  it('adds seat-colored glow when the seat is active (L39-05)', () => {
    const zone = seatZoneStyle(2, { active: true });
    expect(zone.boxShadow).toContain('0 0 0 3px');
    expect(zone.boxShadow).toContain('0 0 28px');
  });
});
