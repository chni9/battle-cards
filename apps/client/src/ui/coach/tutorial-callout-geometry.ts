/**
 * Tutorial callout geometry — technical spec v7 §6.12 (the guide callout is orange, with its arrow
 * outside the highlight); Lot 75 plan Appendix A.8.6 (L75-04). Pure: `TutorialCalloutLayer`
 * measures the targets and draws what this returns. Every value is in px relative to the visible box.
 */

export interface CalloutRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type CalloutArrowSide = 'top' | 'bottom';

/** The ring sits this far outside the target, so it never covers the target's own edge, except where the screen edge clips it (Q2-6). */
export const CALLOUT_RING_GAP_PX = 4;
/** The ring is painted as an outer stroke this thick (`tutorial-callout.tsx` reads it for its box-shadow), outside its box. */
export const CALLOUT_RING_STROKE_PX = 3;
export const CALLOUT_ARROW_W_PX = 20;
export const CALLOUT_ARROW_H_PX = 12;

export interface CalloutPlacement {
  readonly ring: CalloutRect;
  readonly side: CalloutArrowSide;
  readonly arrow: CalloutRect;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** §6.12: the arrow sits outside the ring, above a target whose centre is in the lower half of `viewport`, else below; centred on it and clamped into `viewport`. Box-relative px. */
export function calloutPlacement(
  target: CalloutRect,
  viewport: { readonly width: number; readonly height: number },
): CalloutPlacement {
  const gap = CALLOUT_RING_GAP_PX;
  // Designer 2026-11-06 (Q2-6): the ring is painted with an outer stroke (`CALLOUT_RING_STROKE_PX`), so each
  // edge of its box is clamped `stroke` px inside `viewport`: the whole painted ring stays on screen, and on a
  // clipped side it closes in on the target. A target wholly off-screen gets a zero-size ring, never a negative one.
  const stroke = CALLOUT_RING_STROKE_PX;
  const ringLeft = Math.max(stroke, target.left - gap);
  const ringTop = Math.max(stroke, target.top - gap);
  const ringRight = Math.min(viewport.width - stroke, target.left + target.width + gap);
  const ringBottom = Math.min(viewport.height - stroke, target.top + target.height + gap);
  const ring: CalloutRect = {
    left: ringLeft,
    top: ringTop,
    width: Math.max(0, ringRight - ringLeft),
    height: Math.max(0, ringBottom - ringTop),
  };
  const side: CalloutArrowSide = target.top + target.height / 2 > viewport.height / 2 ? 'top' : 'bottom';
  const left = clamp(target.left + target.width / 2 - CALLOUT_ARROW_W_PX / 2, 0, viewport.width - CALLOUT_ARROW_W_PX);
  const rawTop = side === 'top' ? ring.top - CALLOUT_ARROW_H_PX : ring.top + ring.height;
  const top = clamp(rawTop, 0, viewport.height - CALLOUT_ARROW_H_PX);
  return { ring, side, arrow: { left, top, width: CALLOUT_ARROW_W_PX, height: CALLOUT_ARROW_H_PX } };
}
