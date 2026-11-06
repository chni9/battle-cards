/**
 * The compact bottom band geometry: designer 2026-11-03 "Bas plus court" (decisions.md); controller
 * ruling R5; plan Appendix A.6 and Review Focus 4; technical spec v7 §6.1, §6.4 (L75-13).
 */
import type { PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { layoutSeats, PLATE_BOX, SEAT_BOX, type LayoutBox } from '../../view-model/seat-layout';
import { makeSelf } from '../../view-model/test-fixtures';
import {
  BAND_HYSTERESIS_PX, bandSavingsPx, bottomBandFor, bottomBandSavingsPx, COMPACT_HAND_CARD_W_PX, PLATE_FOOTPRINT_PX, plateOverlapPx, plateRect,
  SPECTATOR_STRIP_COMPACT_PX, SPECTATOR_STRIP_FULL_PX, WATCHING_HEADER_SAVING_PX,
  type BottomBand,
} from './bottom-band';
import { SEAT_GRID_GAP_PX } from './seat-geometry';
import { ARENA_TEST_BOXES, makeArenaView } from './test-view';

const EIGHT = makeArenaView({ seatCount: 8 });
const withArena = (box: LayoutBox, height: number): LayoutBox => ({ viewport: box.viewport, arena: { width: box.arena.width, height } });
const overlapAt = (view: PlayingStateView, box: LayoutBox, plate: number): number => plateOverlapPx(layoutSeats(view, box), box.arena, plate);
/** Two grid rows (an 8 px gutter over each 92 px row) over the 122 px footprint: from here the 8-seat full band clears the plate. */
const THRESHOLD = 2 * (SEAT_GRID_GAP_PX + SEAT_BOX.portrait.height) + PLATE_FOOTPRINT_PX;

describe('plate geometry (A.6)', () => {
  it('draws the plate rect bottom-anchored and growing upward, as CentralPlate does', () => {
    expect(PLATE_FOOTPRINT_PX).toBe(122);
    expect(plateRect('portrait', { width: 360, height: 214 }, PLATE_FOOTPRINT_PX)).toEqual({ left: 120, top: 92, width: 120, height: 122 });
  });

  it('reproduces the Lot 74 gate with the empty 96 px plate: 82 px at 360×740 and 14 px at 375×812', () => {
    expect([overlapAt(EIGHT, ARENA_TEST_BOXES.phone360, PLATE_BOX.portrait.height), overlapAt(EIGHT, ARENA_TEST_BOXES.phone375, PLATE_BOX.portrait.height)]).toEqual([82, 14]);
  });

  it('counts no overlap for seats beside the plate (3 seats at 360×740)', () => {
    expect(overlapAt(makeArenaView(), ARENA_TEST_BOXES.phone360, PLATE_FOOTPRINT_PX)).toBe(0);
  });
});

describe('bottomBandSavingsPx (A.6)', () => {
  it('gives back the strip difference plus the hand height the 52 px cards save, rounded up', () => {
    expect(COMPACT_HAND_CARD_W_PX).toBe(52);
    expect([bottomBandSavingsPx(360), bottomBandSavingsPx(375), bottomBandSavingsPx(768)]).toEqual([118, 122, 195]);
  });
});

describe('bandSavingsPx: the real saving of each POV (designer 2026-11-06, S3)', () => {
  const walkIn = makeArenaView({ seatCount: 8, pov: 'walk-in' });
  const eliminated = makeArenaView({ seatCount: 8, pov: 'eliminated' });
  const reanimating = makeArenaView({ seatCount: 8, pov: 'reanimating' });

  it('a seated or reanimating POV gives back the self strip and hand saving, unchanged', () => {
    expect([bandSavingsPx(EIGHT, 360), bandSavingsPx(reanimating, 360)]).toEqual([bottomBandSavingsPx(360), bottomBandSavingsPx(360)]);
  });

  it('a walk-in gives back only the Watching strip difference: no kit strip, no hand cards', () => {
    expect(bandSavingsPx(walkIn, 360)).toBe(SPECTATOR_STRIP_FULL_PX - SPECTATOR_STRIP_COMPACT_PX);
    expect(SPECTATOR_STRIP_FULL_PX).toBe(183);
  });

  it('an eliminated POV gives back the kit strip and the Watching header difference, with no hand cards to shrink', () => {
    const handTerm = bottomBandSavingsPx(360) - (160 - 67);
    expect(handTerm).toBeGreaterThan(0);
    expect(bandSavingsPx(eliminated, 360)).toBe(bottomBandSavingsPx(360) - handTerm + WATCHING_HEADER_SAVING_PX);
  });

  it('judges the band with that saving: a walk-in at 360×740 with 8 seats stays compact until the arena has its own savings and the slack to spare', () => {
    const phone = ARENA_TEST_BOXES.phone360;
    const savings = bandSavingsPx(walkIn, phone.viewport.width);
    expect(savings).not.toBe(bottomBandSavingsPx(phone.viewport.width));
    expect(bottomBandFor(walkIn, withArena(phone, THRESHOLD - 1), 'full')).toBe('compact');
    expect(bottomBandFor(walkIn, withArena(phone, THRESHOLD - 1 + savings), 'compact')).toBe('compact');
    expect(bottomBandFor(walkIn, withArena(phone, THRESHOLD + savings + BAND_HYSTERESIS_PX - 1), 'compact')).toBe('compact');
    expect(bottomBandFor(walkIn, withArena(phone, THRESHOLD + savings + BAND_HYSTERESIS_PX), 'compact')).toBe('full');
  });
});

describe('bottomBandFor (R5, Review Focus 4)', () => {
  it('is full outside portrait and before the arena is measured (0×0)', () => {
    for (const current of ['full', 'compact'] as const) {
      expect(bottomBandFor(EIGHT, ARENA_TEST_BOXES.landscape, current)).toBe('full');
      expect(bottomBandFor(EIGHT, ARENA_TEST_BOXES.desktop, current)).toBe('full');
      expect(bottomBandFor(EIGHT, { viewport: ARENA_TEST_BOXES.phone360.viewport, arena: { width: 0, height: 0 } }, current)).toBe('full');
    }
  });

  it('at 360×740 with 8 seats: compact under the threshold and still compact when the arena grows by the savings; full 1 px above it (Review Focus 4)', () => {
    const phone = ARENA_TEST_BOXES.phone360;
    const savings = bottomBandSavingsPx(phone.viewport.width);
    expect(THRESHOLD).toBe(322);
    expect(BAND_HYSTERESIS_PX).toBe(48);
    expect(bottomBandFor(EIGHT, withArena(phone, THRESHOLD - 1), 'full')).toBe('compact');
    expect(bottomBandFor(EIGHT, withArena(phone, THRESHOLD - 1 + savings), 'compact')).toBe('compact');
    expect(bottomBandFor(EIGHT, withArena(phone, THRESHOLD + 1), 'full')).toBe('full');
    // Compact returns to full only when the full band's arena would clear the plate by BAND_HYSTERESIS_PX (S1).
    expect(bottomBandFor(EIGHT, withArena(phone, THRESHOLD + savings + BAND_HYSTERESIS_PX - 1), 'compact')).toBe('compact');
    expect(bottomBandFor(EIGHT, withArena(phone, THRESHOLD + savings + BAND_HYSTERESIS_PX), 'compact')).toBe('full');
  });

  it('never flip-flops within BAND_HYSTERESIS_PX of the threshold, even when the strip saves 44 px more than the model (S1, Review Focus 4)', () => {
    const phone = ARENA_TEST_BOXES.phone360;
    const savings = bottomBandSavingsPx(phone.viewport.width);
    // `full` is the arena the full band leaves. A compact band adds the modelled savings plus what the model
    // misses: an upgraded-shield pill can add a fourth pill row to the full strip at 360 px, about 44 px.
    for (let full = THRESHOLD - BAND_HYSTERESIS_PX; full <= THRESHOLD + BAND_HYSTERESIS_PX; full += 1) {
      for (const missed of [0, 44]) {
        let band: BottomBand = 'full';
        const seen: BottomBand[] = [];
        for (let pass = 0; pass < 4; pass += 1) {
          band = bottomBandFor(EIGHT, withArena(phone, band === 'compact' ? full + savings + missed : full), band);
          seen.push(band);
        }
        expect(seen.every((next) => next === seen[0])).toBe(true);
      }
    }
  });

  it('stays compact on an arena shorter than one seat row: the overlap only grows as the arena shrinks', () => {
    // A 2-seat Duplicator on a 360×640 phone: the full band leaves an arena of about 40 px (`duplicator360`'s 140 px on a phone
    // 100 px shorter). That is short of one 92 px seat, so `layoutSeats` falls back to its grid, whose rows start at the arena
    // top whatever its height.
    const view = makeArenaView({ seatCount: 2, overrides: { self: makeSelf({ kitId: 'duplicator' }) } });
    const full: LayoutBox = { viewport: { width: 360, height: 640 }, arena: { width: 360, height: 40 } };
    expect(bottomBandFor(view, full, 'full')).toBe('compact');
    const compact = withArena(full, full.arena.height + bottomBandSavingsPx(full.viewport.width));
    expect(compact.arena.height).toBe(158);
    // The judged arena is 158 − (118 + 48) = −8 px: the seat sits wholly below the arena, still covered by the plate.
    expect(bottomBandFor(view, compact, 'compact')).toBe('compact');
  });

  it('a measured arena squeezed to 0 px tall is compact, never full for good: only a 0-wide arena is unmeasured', () => {
    const squeezed = withArena(ARENA_TEST_BOXES.phone360, 0);
    expect([bottomBandFor(EIGHT, squeezed, 'full'), bottomBandFor(EIGHT, squeezed, 'compact')]).toEqual(['compact', 'compact']);
  });

  it.each([
    { label: '8 seated at 360×740', view: EIGHT, box: ARENA_TEST_BOXES.phone360 },
    { label: '8 walk-in seats at 360×740', view: makeArenaView({ seatCount: 8, pov: 'walk-in' }), box: ARENA_TEST_BOXES.phone360 },
    { label: '8 seated at 375×812', view: EIGHT, box: ARENA_TEST_BOXES.phone375 },
    { label: '8 walk-in seats at 375×812', view: makeArenaView({ seatCount: 8, pov: 'walk-in' }), box: ARENA_TEST_BOXES.phone375 },
    { label: "a 2-seat Duplicator's two-row dock at 360×740", view: makeArenaView({ seatCount: 2, overrides: { self: makeSelf({ kitId: 'duplicator' }) } }), box: ARENA_TEST_BOXES.duplicator360 },
  ])('$label: the full band covers a seat, the compact band clears the plate and stays compact (R5 acceptance)', ({ view, box }) => {
    expect(bottomBandFor(view, box, 'full')).toBe('compact');
    const compact = withArena(box, box.arena.height + bottomBandSavingsPx(box.viewport.width));
    expect(overlapAt(view, compact, PLATE_FOOTPRINT_PX)).toBe(0);
    expect(bottomBandFor(view, compact, 'compact')).toBe('compact');
  });
});
