/**
 * Hint card placement next to an anchor — L46-02.
 */

import { describe, expect, it } from 'vitest';

import { placeHintCard } from './place-hint-card';

describe('placeHintCard (L46-02)', () => {
  it('sits below the anchor when there is room', () => {
    expect(
      placeHintCard(
        { top: 40, left: 20, width: 80, height: 40 },
        { width: 200, height: 120 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ top: 88, left: 20 });
  });

  it('flips above when the dock would overflow', () => {
    const placed = placeHintCard(
      { top: 500, left: 20, width: 80, height: 40 },
      { width: 200, height: 120 },
      { width: 800, height: 560 },
    );
    expect(placed.top).toBeLessThan(500);
    expect(placed.left).toBe(20);
  });

  it('clamps into the viewport', () => {
    const placed = placeHintCard(
      { top: 0, left: 0, width: 40, height: 20 },
      { width: 300, height: 200 },
      { width: 320, height: 240 },
    );
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.left + 300).toBeLessThanOrEqual(312);
  });

  it('sits beside a card cluster instead of covering the other row', () => {
    const cards = { top: 220, left: 420, width: 72, height: 96 };
    const placed = placeHintCard(
      cards,
      { width: 248, height: 140 },
      { width: 900, height: 700 },
      { prefer: 'beside' },
    );
    expect(placed.top).toBe(cards.top);
    expect(placed.left).toBe(cards.left - 248 - 8);
  });

  it('does not treat a full-width dock section as a beside target', () => {
    const section = { top: 180, left: 16, width: 760, height: 280 };
    const placed = placeHintCard(
      section,
      { width: 248, height: 140 },
      { width: 800, height: 700 },
      { prefer: 'beside' },
    );
    expect(placed.top).toBe(section.top - 140 - 8);
  });
});
