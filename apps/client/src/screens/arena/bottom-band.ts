/**
 * The portrait bottom band — designer 2026-11-03 "Bas plus court" (`decisions.md`, controller ruling
 * R5); technical spec v7 §6.1 (the strip and the hand under the arena), §6.4 (the plate never covers a
 * seat); Lot 75 plan Appendix A.6 and Review Focus 4 (L75-13).
 *
 * In portrait, when the full bottom band (the self strip and the hand) would leave an arena so short
 * that the plate covers a seat, the band compacts: the compact self strip (L75-03) and smaller hand
 * cards. The dock keeps its controls, and `SEAT_BOX` and `PLATE_BOX` do not change. This module is
 * the pure trigger: no DOM, no React, so happy-dom's missing layout never decides it.
 *
 * The trigger is stable under its own effect: compacting makes the arena taller, so while the band is
 * compact it judges the arena the full band would leave, and it returns to full only with
 * `BAND_HYSTERESIS_PX` to spare (S1).
 */

import type { PlayingStateView } from '@card-battle/shared';

import { HAND_CARD_ASPECT, HAND_CARD_MAX_W_PX, HAND_CARD_MIN_W_PX } from '../../ui/card/hand-card-size';
import type { Rect } from '../../view-model/drop-target';
import {
  layoutModeFor,
  layoutSeats,
  PLATE_BOX,
  plateCenterFor,
  type LayoutBox,
  type LayoutMode,
  type SeatLayout,
  type Size,
} from '../../view-model/seat-layout';
import { povModeOf } from '../../view-model/seats';
import { seatCenters, seatRect } from './seat-geometry';

export type BottomBand = 'full' | 'compact';

/**
 * The hand card width in the compact portrait band: below the 64 px floor, as R5 allows: the 44 px
 * strip and the 16 px chips hold.
 */
export const COMPACT_HAND_CARD_W_PX = 52;

/**
 * The plate footprint the overlap check uses: the 74 px landing frame, the 4 px gap and one 44 px
 * incoming badge row (open-question ruling 2). Taller plates rely on the press-through.
 */
export const PLATE_FOOTPRINT_PX = 122;

/**
 * S1: the full strip can take a fourth pill row at 360 px, so the modelled savings can miss about
 * 44 px; compact returns to full only with this much slack.
 */
export const BAND_HYSTERESIS_PX = 48;

/**
 * The full self strip at 360 and 375 px with no thumb and no badge: the tile portrait plus three
 * pill rows (L74-26 G4, measured at 375). Pill wrapping depends on font metrics, which a pure helper
 * cannot read, so this is a measured constant.
 */
const FULL_STRIP_PX = 160;
/** The compact strip: `py-1` (8 px) plus the 59 px thumb-portrait row (a 44 px wide, 3:4 thumb; measured in Check 1, 2026-11-06; L75-03). */
const COMPACT_STRIP_PX = 67;
/** The Card `hand` clamp's `19vw` (`clamp(64px,19vw,120px)`). */
const HAND_VIEWPORT_SHARE = 0.19;

/**
 * The height (px) the compact band gives back to the arena at this viewport width: the strip
 * difference plus the hand height the 52 px cards save against the Card clamp. Rounded up, so the
 * band arithmetic stays integral. Exact at 360–375 px with three pill rows; an extra pill row in the
 * full strip is what `BAND_HYSTERESIS_PX` covers.
 */
export function bottomBandSavingsPx(viewportWidth: number): number {
  const fullCardWidth = Math.min(HAND_CARD_MAX_W_PX, Math.max(HAND_CARD_MIN_W_PX, viewportWidth * HAND_VIEWPORT_SHARE));
  return Math.ceil(FULL_STRIP_PX - COMPACT_STRIP_PX + HAND_CARD_ASPECT * (fullCardWidth - COMPACT_HAND_CARD_W_PX));
}

/**
 * The walk-in's Watching strip at 360 and 375 px, full: header panel, Claim a seat, Leave table and the
 * locked line (183 px, measured in Check 1, 2026-11-06; S3). It has no kit and no hand.
 */
export const SPECTATOR_STRIP_FULL_PX = 183;
/** The compact Watching strip: `py-1` (8 px), the header's `py-1` (8 px) and one 44 px row (title, Claim a seat, a Leave icon). */
export const SPECTATOR_STRIP_COMPACT_PX = 60;
/**
 * What an eliminated POV's compact Watching header gives back inside its kit strip: the full header
 * (`py-2`, the 44 px row, the 6 px gap and the two-line locked line, 102 px) less the compact one
 * (`py-1` and the row, 52 px). Pill and line wrapping depend on font metrics, so this is a modelled
 * constant that `BAND_HYSTERESIS_PX` backs up, and Check 3 re-measures it.
 */
export const WATCHING_HEADER_SAVING_PX = 50;

/**
 * The height (px) the compact band gives back for this POV (designer 2026-11-06, S3). A seated or
 * reanimating POV: `bottomBandSavingsPx`. An eliminated POV holds no hand cards to shrink, so it gets the
 * kit strip's saving and its Watching header's, without the hand term. A walk-in has no kit strip and no
 * hand: only the Watching strip's own difference. The finished board shows an eliminated POV's strip without
 * the header, so it is credited `WATCHING_HEADER_SAVING_PX` it does not give back.
 */
export function bandSavingsPx(view: PlayingStateView, viewportWidth: number): number {
  if (view.isSpectator === true) {
    return SPECTATOR_STRIP_FULL_PX - SPECTATOR_STRIP_COMPACT_PX;
  }
  return povModeOf(view) === 'watching'
    ? FULL_STRIP_PX - COMPACT_STRIP_PX + WATCHING_HEADER_SAVING_PX
    : bottomBandSavingsPx(viewportWidth);
}

/**
 * The plate rect in arena pixels for `mode`, `height` tall: bottom-anchored at `PLATE_BOX[mode]` and
 * growing upward, as `CentralPlate` draws it (its `bottom` style).
 */
export function plateRect(mode: LayoutMode, arena: Size, height: number): Rect {
  const center = plateCenterFor(mode, arena);
  const box = PLATE_BOX[mode];
  const bottom = center.centerY + box.height / 2;
  return { left: center.centerX - box.width / 2, top: bottom - height, width: box.width, height };
}

/**
 * The largest overlap (px) of any seat that meets the plate horizontally: how far its bottom edge
 * sits below the plate's top edge; 0 = clear. Not clipped to the plate's own extent: the plate is
 * pinned to the arena's bottom edge and the grid places its rows from the arena top whatever the
 * arena height (`seatCenters`), so a seat drawn below the arena is covered too, and the overlap
 * never falls as the arena shrinks. A clipped overlap read 0 for an arena of 8 px or less.
 */
export function plateOverlapPx(layout: SeatLayout, arena: Size, plateHeight: number): number {
  const plate = plateRect(layout.mode, arena, plateHeight);
  let overlap = 0;
  for (const center of seatCenters(layout, arena)) {
    const seat = seatRect(center, layout.mode, layout.box);
    const meetsHorizontally = seat.left < plate.left + plate.width && plate.left < seat.left + seat.width;
    if (meetsHorizontally) {
      overlap = Math.max(overlap, seat.top + seat.height - plate.top);
    }
  }
  return overlap;
}

/**
 * The band for this render. Any mode but portrait, and an unmeasured arena (0 wide, as before the
 * first measure; a measured region keeps its width), are `'full'`. Otherwise it is `'compact'` when
 * the judged arena would let the plate footprint cover a seat. While `current` is `'compact'` the
 * judged arena is the one the full band would leave, less `BAND_HYSTERESIS_PX`: full → compact keeps
 * the plain threshold, and compact → full needs that slack (S1), so the band never flaps
 * (Review Focus 4).
 */
export function bottomBandFor(view: PlayingStateView, box: LayoutBox, current: BottomBand): BottomBand {
  if (layoutModeFor(box.viewport) !== 'portrait' || box.arena.width === 0) {
    return 'full';
  }
  const slack = current === 'compact' ? bandSavingsPx(view, box.viewport.width) + BAND_HYSTERESIS_PX : 0;
  const judged: LayoutBox = { viewport: box.viewport, arena: { width: box.arena.width, height: box.arena.height - slack } };
  return plateOverlapPx(layoutSeats(view, judged), judged.arena, PLATE_FOOTPRINT_PX) > 0 ? 'compact' : 'full';
}
