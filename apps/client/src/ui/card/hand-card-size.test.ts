/** The landscape-compact hand size rule: technical spec v7 §5.4, §6.4; DESIGN.md › Card › Size contract (L75-03). */
import { describe, expect, it } from 'vitest';

import { HAND_CARD_ASPECT, HAND_CARD_MAX_W_PX, HAND_CARD_MIN_W_PX, heightBoundHandCardWidthPx } from './hand-card-size';

describe('heightBoundHandCardWidthPx (§5.4)', () => {
  it('makes a landscape hand card a quarter of the visible height tall', () => {
    expect([heightBoundHandCardWidthPx(390), heightBoundHandCardWidthPx(480)]).toEqual([65, 80]);
    expect(heightBoundHandCardWidthPx(480) * HAND_CARD_ASPECT).toBe(120);
  });

  it('clamps to the Card hand size, 64 to 120 px', () => {
    expect([HAND_CARD_MIN_W_PX, HAND_CARD_MAX_W_PX, HAND_CARD_ASPECT]).toEqual([64, 120, 1.5]);
    expect([heightBoundHandCardWidthPx(375), heightBoundHandCardWidthPx(0), heightBoundHandCardWidthPx(1000)]).toEqual([64, 64, 120]);
  });

  it('never grows as the visible height shrinks', () => {
    for (let height = 361; height < 500; height += 1) {
      expect(heightBoundHandCardWidthPx(height)).toBeGreaterThanOrEqual(heightBoundHandCardWidthPx(height - 1));
    }
  });
});
