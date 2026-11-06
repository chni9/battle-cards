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
  // Designer 2026-11-06 (Q2-6): a target flush with a screen edge would put the ring `gap` px off-screen,
  // so each edge is clamped into `viewport`: on that side the ring closes in on the target instead.
  const ringLeft = Math.max(0, target.left - gap);
  const ringTop = Math.max(0, target.top - gap);
  const ringRight = Math.min(viewport.width, target.left + target.width + gap);
  const ringBottom = Math.min(viewport.height, target.top + target.height + gap);
  const ring: CalloutRect = { left: ringLeft, top: ringTop, width: ringRight - ringLeft, height: ringBottom - ringTop };
  const side: CalloutArrowSide = target.top + target.height / 2 > viewport.height / 2 ? 'top' : 'bottom';
  const left = clamp(target.left + target.width / 2 - CALLOUT_ARROW_W_PX / 2, 0, viewport.width - CALLOUT_ARROW_W_PX);
  const rawTop = side === 'top' ? ring.top - CALLOUT_ARROW_H_PX : ring.top + ring.height;
  const top = clamp(rawTop, 0, viewport.height - CALLOUT_ARROW_H_PX);
  return { ring, side, arrow: { left, top, width: CALLOUT_ARROW_W_PX, height: CALLOUT_ARROW_H_PX } };
}
