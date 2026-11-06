/** Tutorial callout geometry: technical spec v7 §6.12 (the arrow sits outside the highlight); L75-04. */
import { describe, expect, it } from 'vitest';

import { CALLOUT_ARROW_H_PX, CALLOUT_ARROW_W_PX, CALLOUT_RING_GAP_PX, calloutPlacement } from './tutorial-callout-geometry';

const PHONE = { width: 390, height: 844 };

describe('calloutPlacement (spec v7 §6.12)', () => {
  it('rings the target with a gap and points down at it from above when it sits in the lower half', () => {
    const placed = calloutPlacement({ left: 100, top: 700, width: 80, height: 40 }, PHONE);
    const gap = CALLOUT_RING_GAP_PX;
    expect(placed.ring).toEqual({ left: 100 - gap, top: 700 - gap, width: 80 + 2 * gap, height: 40 + 2 * gap });
    expect(placed.side).toBe('top');
    expect(placed.arrow).toEqual({ left: 140 - CALLOUT_ARROW_W_PX / 2, top: placed.ring.top - CALLOUT_ARROW_H_PX, width: CALLOUT_ARROW_W_PX, height: CALLOUT_ARROW_H_PX });
  });
  it('points up at a target in the upper half from under its ring', () => {
    const placed = calloutPlacement({ left: 10, top: 8, width: 120, height: 60 }, PHONE);
    expect([placed.side, placed.arrow.top]).toEqual(['bottom', placed.ring.top + placed.ring.height]);
  });
  it('keeps the arrow inside the visible box at both edges', () => {
    expect(calloutPlacement({ left: 0, top: 600, width: 8, height: 40 }, PHONE).arrow.left).toBe(0);
    expect(calloutPlacement({ left: 384, top: 600, width: 6, height: 40 }, PHONE).arrow.left).toBe(PHONE.width - CALLOUT_ARROW_W_PX);
  });
});
