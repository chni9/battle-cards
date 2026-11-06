/**
 * Where the tutorial coach sits in the arena — technical spec v7 §6.12; Lot 75 plan Appendix A.8.1
 * (K8: the arena region's top-left, 8 px in) and designer 2026-11-06 (Check 2 stop item S4): at
 * 375×812 that corner is directly over the opponent seat and the Incoming plate, so the coach hid what
 * the tour marked. It now flips to the arena's bottom edge, but only while a marked element overlaps
 * the default box. Pure: no DOM, no React; `tutorial-coach-host.tsx` measures and calls it.
 */

import type { Rect } from '../../view-model/drop-target';
import type { Size } from '../../view-model/seat-layout';

/** The coach's inset from the arena region's edge (K8). */
export const COACH_INSET_PX = 8;

/**
 * How far a mark's callout reaches outside it: the 3 px ring 4 px out and the 12 px arrow
 * (`ui/coach/tutorial-callout-geometry.ts`), plus 1 px. A coach that touches this zone hides the
 * ring or the arrow, which the tour needs as much as the element.
 */
export const COACH_MARK_CLEARANCE_PX = 20;

export type CoachEdge = 'top' | 'bottom';

export interface CoachPlacement {
  readonly edge: CoachEdge;
  /** The slot's top-left in the same coordinates as `arena`. */
  readonly top: number;
  readonly left: number;
}

export interface CoachPlacementInput {
  /** The measured coach panel. */
  readonly coach: Size;
  /** The `[data-arena-region="arena"]` rect. The bottom position keeps the coach above its bottom edge, clear of the self strip, the hand and the dock. */
  readonly arena: Rect;
  /** The live `[data-tutorial-highlight]` rects: the marked element or elements. */
  readonly marks: readonly Rect[];
}

/** The area of `a` ∩ `b`, 0 when they only touch. */
function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** The marks grown by `COACH_MARK_CLEARANCE_PX` on every side, as the callout draws them. */
function withCallout(mark: Rect): Rect {
  return {
    left: mark.left - COACH_MARK_CLEARANCE_PX,
    top: mark.top - COACH_MARK_CLEARANCE_PX,
    width: mark.width + 2 * COACH_MARK_CLEARANCE_PX,
    height: mark.height + 2 * COACH_MARK_CLEARANCE_PX,
  };
}

/**
 * The top-left corner (K8), or the arena's bottom edge when a mark overlaps the default box and the
 * bottom box covers the marks strictly less: if the bottom would hide as much, the default stays, so
 * the coach never moves for nothing. A coach taller than the arena keeps its top edge inside it.
 */
export function placeCoach({ coach, arena, marks }: CoachPlacementInput): CoachPlacement {
  const left = arena.left + COACH_INSET_PX;
  const topEdge = arena.top + COACH_INSET_PX;
  const bottomEdge = Math.max(topEdge, arena.top + arena.height - COACH_INSET_PX - coach.height);
  const coveredAt = (top: number): number => {
    const box: Rect = { left, top, width: coach.width, height: coach.height };
    return marks.reduce((sum, mark) => sum + overlapArea(box, withCallout(mark)), 0);
  };
  const atTop = coveredAt(topEdge);
  return atTop > 0 && coveredAt(bottomEdge) < atTop
    ? { edge: 'bottom', top: bottomEdge, left }
    : { edge: 'top', top: topEdge, left };
}
