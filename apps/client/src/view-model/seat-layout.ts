/**
 * Seat layout — technical spec v7 §6.4 (amended: one mode rule, arc order, grid fallback) and
 * §14.3 (the box constants are L73 starting values the L74 playtest tunes); Lot 73 (L73-03).
 *
 * The layout is pure geometry over the arena box the caller measured: no DOM, no clock. The mode
 * is `ui/viewport-mode.ts` `viewportModeFor`, the one rule shared with sheet placement and
 * Carousel `gridAtDesktop`, so the three cannot drift apart. Seats are placed on an ellipse
 * centred on the central plate; when two seat boxes would sit closer than `SEAT_MIN_GAP_PX`
 * the layout falls back to a grid instead of overlapping them (§6.4).
 */

import type { PlayingStateView } from '@card-battle/shared';

import { viewportModeFor, type ViewportMode } from '../ui/viewport-mode';

export type LayoutMode = ViewportMode;

export interface Size {
  width: number;
  height: number;
}

/** The visible box (it picks the mode) and the arena the seats share (it sizes the geometry). */
export interface LayoutBox {
  viewport: Size;
  arena: Size;
}

/** Two seat boxes closer than this on both axes are "too close": the layout becomes a grid (§6.4). */
export const SEAT_MIN_GAP_PX = 8;

/**
 * Seat bounding box, badge row included (§6.4). L73 starting values; L74 tunes them (§14.3).
 * L75-03: the landscape band draws the portrait anatomy, so its box is the portrait box (it was 76×84,
 * which clipped the anatomy 4 px at the region top). The desktop box is the full size: a short arena
 * shrinks it toward the portrait box (`desktopSeatBox`, designer 2026-11-06).
 */
export const SEAT_BOX: Readonly<Record<LayoutMode, Size>> = {
  portrait: { width: 76, height: 92 },
  'landscape-compact': { width: 76, height: 92 },
  desktop: { width: 120, height: 136 },
};

/** Central plate box (§6.1 item 2; desktop "larger plate", §6.4). L74 tunes them (§14.3). */
export const PLATE_BOX: Readonly<Record<LayoutMode, Size>> = {
  portrait: { width: 120, height: 96 },
  'landscape-compact': { width: 140, height: 80 },
  desktop: { width: 220, height: 160 },
};

export interface SeatPlacement {
  playerId: string;
  centerX: number;
  centerY: number;
}

/**
 * `arc` covers the ellipse and the landscape-compact top band (the contract has no third kind).
 * `grid` rows follow seat order. `box` is the seat box a desktop layout was placed with, which
 * `desktopSeatBox` may shrink below `SEAT_BOX.desktop`; the other modes omit it and draw
 * `SEAT_BOX[mode]` (`seatBoxOf`).
 */
export type SeatLayout =
  | { kind: 'arc'; mode: LayoutMode; placements: readonly SeatPlacement[]; box?: Size }
  | { kind: 'grid'; mode: LayoutMode; rows: readonly (readonly string[])[]; box?: Size };

/** The seat box `layout` was placed with: its own `box` (desktop), else `SEAT_BOX[mode]`. */
export function seatBoxOf(layout: SeatLayout): Size {
  return layout.box ?? SEAT_BOX[layout.mode];
}

export function layoutModeFor(viewport: Size): LayoutMode {
  return viewportModeFor(viewport);
}

/**
 * The seats in drawing order, clockwise from the player after the POV (§6.4). A walk-in has no
 * anchor, so every seat comes from `turnOrder[0]`. A seated POV missing from `turnOrder`, which
 * the server never sends, leaves the order unrotated.
 */
export function seatOrder(view: PlayingStateView): readonly string[] {
  if (view.isSpectator === true) {
    return [...view.turnOrder];
  }
  const povIndex = view.turnOrder.indexOf(view.you);
  return [...view.turnOrder.slice(povIndex + 1), ...view.turnOrder.slice(0, Math.max(povIndex, 0))];
}

/**
 * Where the central plate sits in the arena (§6.1 item 2). Portrait: centred on the bottom edge,
 * so the seat arc rises above it. Desktop: the arena centre. Landscape-compact: centred below
 * the top seat band.
 */
export function plateCenterFor(mode: LayoutMode, arena: Size): { centerX: number; centerY: number } {
  const centerX = arena.width / 2;
  switch (mode) {
    case 'portrait':
      return { centerX, centerY: arena.height - PLATE_BOX.portrait.height / 2 };
    case 'desktop':
      return { centerX, centerY: arena.height / 2 };
    case 'landscape-compact':
      return { centerX, centerY: (arena.height + SEAT_BOX['landscape-compact'].height) / 2 };
  }
}

export function layoutSeats(view: PlayingStateView, box: LayoutBox): SeatLayout {
  const order = seatOrder(view);
  const mode = layoutModeFor(box.viewport);
  const isWalkIn = view.isSpectator === true;
  if (mode !== 'desktop') {
    return placeSeats(order, mode, SEAT_BOX[mode], box.arena, isWalkIn);
  }
  const seat = desktopSeatBox(box.arena, order.length, isWalkIn);
  return { ...placeSeats(order, mode, seat, box.arena, isWalkIn), box: seat };
}

/** The seats of `order` placed at the seat box `seat` (§6.4): the ellipse, the band, or the grid fallback. */
function placeSeats(
  order: readonly string[],
  mode: LayoutMode,
  seat: Size,
  arena: Size,
  isWalkIn: boolean,
): SeatLayout {
  // A 0×0 arena on the first paint, before the caller measures, would give negative radii.
  if (arena.width < seat.width || arena.height < seat.height) {
    return gridOf(mode, order);
  }

  let placements: readonly SeatPlacement[];
  if (mode === 'landscape-compact') {
    placements = order.map((playerId, index) => ({
      playerId,
      centerX: (arena.width * (index + 0.5)) / order.length,
      centerY: seat.height / 2,
    }));
  } else {
    const plate = plateCenterFor(mode, arena);
    // The ellipse touches the arena's top and sides, so a seat box stays inside the arena. The
    // plate sits on the bottom edge in portrait, which can make the vertical radius negative
    // for an arena only a little taller than one seat.
    const radiusX = plate.centerX - seat.width / 2;
    const radiusY = plate.centerY - seat.height / 2;
    if (radiusX < 0 || radiusY < 0) {
      return gridOf(mode, order);
    }
    placements = order.map((playerId, index) => {
      const radians = (angleDegrees(mode, isWalkIn, index, order.length) * Math.PI) / 180;
      return {
        playerId,
        centerX: plate.centerX + radiusX * Math.cos(radians),
        // Screen y grows down, so a falling angle is clockwise.
        centerY: plate.centerY - radiusY * Math.sin(radians),
      };
    });
  }

  if (anyTooClose(placements, seat)) {
    return gridOf(mode, order);
  }
  return { kind: 'arc', mode, placements };
}

/**
 * The plate's visible height the desktop fit clears: the 74 px landing frame (`CentralPlate`'s
 * `min-h-[74px]`). Incoming badges grow upward from it and rely on the plate's press-through, as in
 * portrait (`PLATE_FOOTPRINT_PX`); the fit does not reserve them, or no seat box could clear the
 * plate at 1024×600.
 */
export const DESKTOP_PLATE_FOOTPRINT_PX = 74;

/**
 * The desktop seat box for this arena (designer 2026-11-06): `SEAT_BOX.desktop` when the layout it
 * gives clears the plate and stays inside the arena, else the largest box between it and
 * `SEAT_BOX.portrait` (1 px steps, both axes) that does, else the portrait box. An unmeasured arena
 * keeps the desktop box (nothing is drawn yet). The seat count and whether the POV is a walk-in
 * decide the angles, hence the fit (`angleDegrees`).
 */
export function desktopSeatBox(arena: Size, seatCount: number, isWalkIn = false): Size {
  const full = SEAT_BOX.desktop;
  const smallest = SEAT_BOX.portrait;
  if (arena.width <= 0 || arena.height <= 0) {
    return full;
  }
  const order = Array.from({ length: seatCount }, (_, index) => String(index));
  const steps = full.width - smallest.width;
  for (let grow = steps; grow > 0; grow -= 1) {
    const candidate: Size = {
      width: smallest.width + grow,
      height: smallest.height + Math.round(((full.height - smallest.height) * grow) / steps),
    };
    if (clearsPlate(placeSeats(order, 'desktop', candidate, arena, isWalkIn), candidate, arena)) {
      return candidate;
    }
  }
  return smallest;
}

/** Float slack for the ellipse's exact contact with the arena edges (a seat at 0° or 180° touches the side). */
const FIT_EPSILON_PX = 1e-6;

/** No seat box meets the plate's visible footprint (`DESKTOP_PLATE_FOOTPRINT_PX`, bottom-anchored), and none leaves the arena. */
function clearsPlate(layout: SeatLayout, seat: Size, arena: Size): boolean {
  const plate = plateCenterFor('desktop', arena);
  const plateBox = PLATE_BOX.desktop;
  const plateBottom = plate.centerY + plateBox.height / 2;
  const plateTop = plateBottom - DESKTOP_PLATE_FOOTPRINT_PX;
  return seatCentersOf(layout, seat, arena).every(({ centerX, centerY }) => {
    const left = centerX - seat.width / 2;
    const right = centerX + seat.width / 2;
    const top = centerY - seat.height / 2;
    const bottom = centerY + seat.height / 2;
    const inside =
      left >= -FIT_EPSILON_PX &&
      right <= arena.width + FIT_EPSILON_PX &&
      top >= -FIT_EPSILON_PX &&
      bottom <= arena.height + FIT_EPSILON_PX;
    const meetsPlate = left < plate.centerX + plateBox.width / 2 && plate.centerX - plateBox.width / 2 < right;
    // A seat wholly below the footprint (the lower flanks of a tall ellipse) is clear of it.
    const meetsFootprint = meetsPlate && bottom > plateTop + FIT_EPSILON_PX && top < plateBottom - FIT_EPSILON_PX;
    return inside && !meetsFootprint;
  });
}

/**
 * Seat centres in arena pixels, in drawing order: the arc placements as given, or the grid rows laid
 * out at seat box `seat` (`ceil(n/2)` over `floor(n/2)`, `SEAT_MIN_GAP_PX` gutters, from the arena top).
 */
export function seatCentersOf(layout: SeatLayout, seat: Size, arena: Size): readonly SeatPlacement[] {
  if (layout.kind === 'arc') {
    return layout.placements;
  }
  return layout.rows.flatMap((row, rowIndex) =>
    row.map((playerId, column) => ({
      playerId,
      centerX: arena.width / 2 + (column - (row.length - 1) / 2) * (seat.width + SEAT_MIN_GAP_PX),
      centerY: SEAT_MIN_GAP_PX + rowIndex * (seat.height + SEAT_MIN_GAP_PX) + seat.height / 2,
    })),
  );
}

/**
 * Seat angle on the ellipse, degrees counter-clockwise from the right (270 is the bottom).
 * Portrait: the upper half only, n equal sectors at half steps, left to right. Desktop: the
 * full ellipse, slot 0 (the bottom) left to the POV, so a seated table has n + 1 slots; a
 * walk-in reserves none and spreads n slots half a step from the bottom (decisions.md
 * 2026-10-27 "V7 seat layout geometry").
 */
function angleDegrees(
  mode: Exclude<LayoutMode, 'landscape-compact'>,
  isWalkIn: boolean,
  index: number,
  count: number,
): number {
  if (mode === 'portrait') {
    return 180 - ((index + 0.5) * 180) / count;
  }
  return isWalkIn ? 270 - ((index + 0.5) * 360) / count : 270 - ((index + 1) * 360) / (count + 1);
}

/** Under `SEAT_MIN_GAP_PX` on both axes: a gutter on either axis is enough to separate two boxes. */
function anyTooClose(placements: readonly SeatPlacement[], seat: Size): boolean {
  return placements.some((a, index) =>
    placements.slice(index + 1).some((b) => {
      const gap = Math.max(
        Math.abs(a.centerX - b.centerX) - seat.width,
        Math.abs(a.centerY - b.centerY) - seat.height,
      );
      return gap < SEAT_MIN_GAP_PX;
    }),
  );
}

/** `ceil(n/2)` over `floor(n/2)` in seat order; an empty second row is dropped. */
function gridOf(mode: LayoutMode, order: readonly string[]): SeatLayout {
  const firstRow = Math.ceil(order.length / 2);
  return {
    kind: 'grid',
    mode,
    rows: [order.slice(0, firstRow), order.slice(firstRow)].filter((row) => row.length > 0),
  };
}
