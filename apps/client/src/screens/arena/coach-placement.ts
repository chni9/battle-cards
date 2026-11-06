/**
 * Where the tutorial coach sits in the arena — technical spec v7 §6.12; Lot 75 plan Appendix A.8.1
 * (K8: the arena region's top-left, 8 px in) and designer 2026-11-06 (Check 2 stop item S4): at
 * 375×812 that corner is directly over the opponent seat and the Incoming plate, so the coach hid what
 * the tour marked. It now flips to the arena's bottom edge, but only while a marked element overlaps
 * the default box; and designer 2026-11-06 (Q2-5) adds a third slot under the opponent row for when
 * both of those overlap the marks. Designer 2026-11-06 (Gate B stop item S-B1, option b): during the
 * tour only, when the table is locked, the slots may leave the arena for the viewport's top and bottom
 * edges. Pure: no DOM, no React; `tutorial-coach-host.tsx` measures and calls it.
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

export type CoachEdge = 'top' | 'bottom' | 'under-opponents';

export interface CoachPlacement {
  readonly edge: CoachEdge;
  /** The slot's top-left in the same coordinates as `arena`. */
  readonly top: number;
  readonly left: number;
}

/** The arena-only slots (script steps), or the viewport's edges (tour steps). */
export type CoachBounds = 'arena' | 'viewport';

interface CoachPlacementBase {
  /** The measured coach panel. */
  readonly coach: Size;
  /** The `[data-arena-region="arena"]` rect. With arena bounds the bottom position keeps the coach above its bottom edge, clear of the self strip, the hand and the dock. */
  readonly arena: Rect;
  /** The live `[data-tutorial-highlight]` rects: the marked element or elements. */
  readonly marks: readonly Rect[];
  /**
   * The opponent row: the box around every opponent seat. The third slot sits under it, clear of the
   * seats' own rings and arrows. Absent (no seat measured), the coach has the two slots only.
   */
  readonly opponents?: Rect;
}

export type CoachPlacementInput = CoachPlacementBase &
  (
    | { readonly bounds?: 'arena' }
    | {
        /**
         * The tour (S-B1): the table is locked, so the coach may sit over the self strip and the hand.
         * The top and bottom slots are the viewport's edges, and the least-covering of top, bottom and
         * under-opponents wins, a tie going to the earlier of them.
         */
        readonly bounds: 'viewport';
        /** The visible viewport, in the same coordinates as `arena`. */
        readonly viewport: Rect;
      }
  );

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
 * the coach never moves for nothing. When both overlap the marks, the slot under the opponent row
 * (designer 2026-11-06, Q2-5) takes over if it covers them strictly less than the top-left does. A
 * coach taller than the arena keeps its top edge inside it.
 */
export function placeCoach(input: CoachPlacementInput): CoachPlacement {
  const { coach, arena, marks, opponents } = input;
  const region = input.bounds === 'viewport' ? input.viewport : arena;
  // The viewport case keeps the coach on screen sideways too; the arena case is unchanged.
  const left =
    input.bounds === 'viewport'
      ? Math.max(region.left, Math.min(arena.left + COACH_INSET_PX, region.left + region.width - coach.width))
      : arena.left + COACH_INSET_PX;
  const topEdge = region.top + COACH_INSET_PX;
  const bottomEdge = Math.max(topEdge, region.top + region.height - COACH_INSET_PX - coach.height);
  const coveredAt = (top: number): number => {
    const box: Rect = { left, top, width: coach.width, height: coach.height };
    return marks.reduce((sum, mark) => sum + overlapArea(box, withCallout(mark)), 0);
  };
  const atTop = coveredAt(topEdge);
  if (input.bounds === 'viewport') {
    const slots: CoachPlacement[] = [{ edge: 'top', top: topEdge, left }, { edge: 'bottom', top: bottomEdge, left }];
    if (opponents !== undefined) {
      const underEdge = Math.min(bottomEdge, Math.max(topEdge, opponents.top + opponents.height + COACH_MARK_CLEARANCE_PX));
      slots.push({ edge: 'under-opponents', top: underEdge, left });
    }
    // `reduce` keeps the earlier slot on a tie: top, then bottom, then under.
    return slots.reduce((best, slot) => (coveredAt(slot.top) < coveredAt(best.top) ? slot : best));
  }
  if (atTop === 0) return { edge: 'top', top: topEdge, left };
  const atBottom = coveredAt(bottomEdge);
  if (atBottom < atTop) return { edge: 'bottom', top: bottomEdge, left };
  if (opponents !== undefined) {
    const underEdge = Math.min(
      bottomEdge,
      Math.max(topEdge, opponents.top + opponents.height + COACH_MARK_CLEARANCE_PX),
    );
    if (coveredAt(underEdge) < atTop) return { edge: 'under-opponents', top: underEdge, left };
  }
  return { edge: 'top', top: topEdge, left };
}
