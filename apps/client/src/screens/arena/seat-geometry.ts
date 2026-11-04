/**
 * Where each opponent seat is drawn in the arena — technical spec v7 §6.4 (arc placements, grid
 * rows `ceil(n/2)` over `floor(n/2)`, the 8 px minimum gap); L74-04.
 *
 * Grid seats are placed by this pure helper, not measured in the DOM, so the threat arrows
 * (L74-06) and the drop zones (L74-12) read the same numbers as the seats themselves.
 *
 * Since L75-02 each mode draws its seat at its own box, `SEAT_BOX[mode]` (spec v7 §6.4; Lot 75
 * plan Appendix A.4.3); the grid spacing follows the layout's mode.
 */

import type { Rect } from '../../view-model/drop-target';
import {
  SEAT_BOX,
  SEAT_MIN_GAP_PX,
  type LayoutMode,
  type SeatLayout,
  type SeatPlacement,
  type Size,
} from '../../view-model/seat-layout';

/** The drawn seat box for `mode`: `SEAT_BOX[mode]` (L75-02, plan A.4.3). */
export function seatRenderBox(mode: LayoutMode): Size {
  return SEAT_BOX[mode];
}

/** The portrait seat box, `seatRenderBox('portrait')` (L74-04; kept exported, plan A.4.3). */
export const SEAT_RENDER_BOX: Size = seatRenderBox('portrait');

/** Gutter between grid seats and above the first grid row: the §6.4 minimum gap. */
export const SEAT_GRID_GAP_PX: number = SEAT_MIN_GAP_PX;

/** Seat centres in arena pixels, in drawing order: the arc placements as given, or the grid rows laid out. */
export function seatCenters(layout: SeatLayout, arena: Size): readonly SeatPlacement[] {
  if (layout.kind === 'arc') {
    return layout.placements;
  }
  const { width, height } = seatRenderBox(layout.mode);
  return layout.rows.flatMap((row, rowIndex) =>
    row.map((playerId, column) => ({
      playerId,
      centerX: arena.width / 2 + (column - (row.length - 1) / 2) * (width + SEAT_GRID_GAP_PX),
      centerY: SEAT_GRID_GAP_PX + rowIndex * (height + SEAT_GRID_GAP_PX) + height / 2,
    })),
  );
}

/** The seat box for `mode` (portrait by default) around a centre. */
export function seatRect(center: SeatPlacement, mode: LayoutMode = 'portrait'): Rect {
  const { width, height } = seatRenderBox(mode);
  return { left: center.centerX - width / 2, top: center.centerY - height / 2, width, height };
}
