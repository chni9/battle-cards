/**
 * Where each opponent seat is drawn in the arena — technical spec v7 §6.4 (arc placements, grid
 * rows `ceil(n/2)` over `floor(n/2)`, the 8 px minimum gap); L74-04.
 *
 * Grid seats are placed by this pure helper, not measured in the DOM, so the threat arrows
 * (L74-06) and the drop zones (L74-12) read the same numbers as the seats themselves.
 */

import type { Rect } from '../../view-model/drop-target';
import { SEAT_BOX, SEAT_MIN_GAP_PX, type SeatLayout, type SeatPlacement, type Size } from '../../view-model/seat-layout';

/** The drawn seat: the portrait anatomy in every mode until L75 (L74-04 brief). */
export const SEAT_RENDER_BOX: Size = SEAT_BOX.portrait;

/** Gutter between grid seats and above the first grid row: the §6.4 minimum gap. */
export const SEAT_GRID_GAP_PX: number = SEAT_MIN_GAP_PX;

/** Seat centres in arena pixels, in drawing order: the arc placements as given, or the grid rows laid out. */
export function seatCenters(layout: SeatLayout, arena: Size): readonly SeatPlacement[] {
  if (layout.kind === 'arc') {
    return layout.placements;
  }
  const { width, height } = SEAT_RENDER_BOX;
  return layout.rows.flatMap((row, rowIndex) =>
    row.map((playerId, column) => ({
      playerId,
      centerX: arena.width / 2 + (column - (row.length - 1) / 2) * (width + SEAT_GRID_GAP_PX),
      centerY: SEAT_GRID_GAP_PX + rowIndex * (height + SEAT_GRID_GAP_PX) + height / 2,
    })),
  );
}

/** The seat box around a centre (`SEAT_RENDER_BOX`). */
export function seatRect(center: SeatPlacement): Rect {
  const { width, height } = SEAT_RENDER_BOX;
  return { left: center.centerX - width / 2, top: center.centerY - height / 2, width, height };
}
