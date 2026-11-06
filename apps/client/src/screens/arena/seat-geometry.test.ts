/** Seat geometry: spec v7 §6.4 (arc placements, grid rows `ceil(n/2)` over `floor(n/2)`, 8 px gap), L74-04. */
import { describe, expect, it } from 'vitest';

import {
  DESKTOP_PLATE_FOOTPRINT_PX,
  SEAT_BOX,
  desktopSeatBox,
  layoutSeats,
  seatBoxOf,
  type LayoutBox,
  type SeatLayout,
} from '../../view-model/seat-layout';
import { makeTableView } from '../../view-model/test-fixtures';
import { plateRect } from './bottom-band';
import { SEAT_GRID_GAP_PX, SEAT_RENDER_BOX, seatCenters, seatRect, seatRenderBox } from './seat-geometry';
import { ARENA_TEST_BOXES, makeArenaView } from './test-view';

const ARENA = { width: 360, height: 320 };

describe('seat geometry (§6.4)', () => {
  it('draws the portrait seat box with the §6.4 gap', () => {
    expect(SEAT_RENDER_BOX).toEqual(SEAT_BOX.portrait);
    expect(SEAT_GRID_GAP_PX).toBe(8);
  });

  it('keeps the arc placements of the model', () => {
    const layout: SeatLayout = {
      kind: 'arc',
      mode: 'portrait',
      placements: [{ playerId: 'p1', centerX: 59, centerY: 179 }, { playerId: 'p2', centerX: 195, centerY: 46 }],
    };
    expect(seatCenters(layout, ARENA)).toEqual(layout.placements);
  });

  it('lays a 4 + 3 grid out centred, row by row, in seat order', () => {
    const layout: SeatLayout = { kind: 'grid', mode: 'portrait', rows: [['p1', 'p2', 'p3', 'p4'], ['p5', 'p6', 'p7']] };
    expect(seatCenters(layout, ARENA)).toEqual([
      { playerId: 'p1', centerX: 54, centerY: 54 },
      { playerId: 'p2', centerX: 138, centerY: 54 },
      { playerId: 'p3', centerX: 222, centerY: 54 },
      { playerId: 'p4', centerX: 306, centerY: 54 },
      { playerId: 'p5', centerX: 96, centerY: 154 },
      { playerId: 'p6', centerX: 180, centerY: 154 },
      { playerId: 'p7', centerX: 264, centerY: 154 },
    ]);
  });

  it('boxes a seat around its centre; a 4-seat row keeps 16 px from both 360 px edges', () => {
    expect(seatRect({ playerId: 'p1', centerX: 54, centerY: 54 })).toEqual({ left: 16, top: 8, width: 76, height: 92 });
    expect(seatRect({ playerId: 'p4', centerX: 306, centerY: 54 }).left + 76).toBe(344);
  });

  it('draws each mode at its own seat box, portrait by default (L75-02)', () => {
    for (const mode of ['portrait', 'landscape-compact', 'desktop'] as const) {
      expect(seatRenderBox(mode)).toEqual(SEAT_BOX[mode]);
    }
    expect(seatRenderBox('portrait')).toEqual(SEAT_RENDER_BOX);
    const center = { playerId: 'p1', centerX: 200, centerY: 100 };
    const desk = SEAT_BOX.desktop;
    expect(seatRect(center, 'desktop')).toEqual({ left: 200 - desk.width / 2, top: 100 - desk.height / 2, width: desk.width, height: desk.height });
    expect(seatRect(center)).toEqual(seatRect(center, 'portrait'));
  });

  it('spaces a desktop grid by the desktop box', () => {
    const { width, height } = SEAT_BOX.desktop;
    const layout: SeatLayout = { kind: 'grid', mode: 'desktop', rows: [['p1', 'p2'], ['p3']] };
    const firstRow = SEAT_GRID_GAP_PX + height / 2;
    expect(seatCenters(layout, { width: 1000, height: 120 })).toEqual([
      { playerId: 'p1', centerX: 500 - (width + SEAT_GRID_GAP_PX) / 2, centerY: firstRow },
      { playerId: 'p2', centerX: 500 + (width + SEAT_GRID_GAP_PX) / 2, centerY: firstRow },
      { playerId: 'p3', centerX: 500, centerY: firstRow + height + SEAT_GRID_GAP_PX },
    ]);
  });
});

describe('desktop seats shrink on a short arena (designer 2026-11-06, S1)', () => {
  /**
   * How far any seat box reaches into the plate's footprint (the plate rect the arena draws,
   * bottom-anchored `DESKTOP_PLATE_FOOTPRINT_PX` tall) and out of the arena, from the geometry the arena draws.
   */
  function fit(layout: SeatLayout, arena: LayoutBox['arena']): { overlap: number; cropped: number } {
    const plate = plateRect(layout.mode, arena, DESKTOP_PLATE_FOOTPRINT_PX);
    let overlap = 0;
    let cropped = 0;
    for (const center of seatCenters(layout, arena)) {
      const rect = seatRect(center, layout.mode, layout.box);
      cropped = Math.max(cropped, -rect.left, -rect.top, rect.left + rect.width - arena.width, rect.top + rect.height - arena.height);
      const meets =
        rect.left < plate.left + plate.width && plate.left < rect.left + rect.width && rect.top < plate.top + plate.height;
      if (meets) overlap = Math.max(overlap, rect.top + rect.height - plate.top);
    }
    return { overlap, cropped };
  }
  const seatsAt = (box: LayoutBox, seatCount: number): SeatLayout => layoutSeats(makeArenaView({ seatCount }), box);
  const EPSILON = 1e-6;
  const smaller = (box: { width: number; height: number }): boolean =>
    box.width < SEAT_BOX.desktop.width && box.height < SEAT_BOX.desktop.height;

  it('keeps the 120×136 box at 1440×900 for every seat count', () => {
    for (const seatCount of [2, 4, 8]) {
      const layout = seatsAt(ARENA_TEST_BOXES.desktop, seatCount);
      const { overlap, cropped } = fit(layout, ARENA_TEST_BOXES.desktop.arena);
      expect([seatBoxOf(layout), overlap <= 0, cropped <= EPSILON]).toEqual([SEAT_BOX.desktop, true, true]);
    }
  });

  it('1024×600 with 4 seats: smaller than 120×136, not below the portrait box, no seat on the plate, none cropped', () => {
    const { arena } = ARENA_TEST_BOXES.desktopShort;
    const layout = seatsAt(ARENA_TEST_BOXES.desktopShort, 4);
    const box = seatBoxOf(layout);
    expect(smaller(box)).toBe(true);
    expect(box.width).toBeGreaterThanOrEqual(SEAT_BOX.portrait.width);
    expect(box.height).toBeGreaterThanOrEqual(SEAT_BOX.portrait.height);
    expect(layout.kind).toBe('arc');
    const { overlap, cropped } = fit(layout, arena);
    expect([overlap <= 0, cropped <= EPSILON]).toEqual([true, true]);
  });

  it('a walk-in watching 3 seats at 1024×600 fits too', () => {
    const view = makeTableView(['p0', 'p1', 'p2'], { you: 'watcher', isSpectator: true });
    const layout = layoutSeats(view, ARENA_TEST_BOXES.desktopShort);
    const { overlap, cropped } = fit(layout, ARENA_TEST_BOXES.desktopShort.arena);
    expect([smaller(seatBoxOf(layout)), overlap <= 0, cropped <= EPSILON]).toEqual([true, true, true]);
  });

  it('8 seats shrink to a clean arc once the arena is tall enough for the ellipse (300 px)', () => {
    const box: LayoutBox = { viewport: ARENA_TEST_BOXES.desktopShort.viewport, arena: { width: 688, height: 300 } };
    const layout = seatsAt(box, 8);
    const { overlap, cropped } = fit(layout, box.arena);
    expect([layout.kind, smaller(seatBoxOf(layout)), overlap <= 0, cropped <= EPSILON]).toEqual(['arc', true, true, true]);
  });

  it('8 seats at 1024×600 (189 px): no box from 120×136 down to the portrait box clears the plate, so it takes the portrait floor', () => {
    const layout = seatsAt(ARENA_TEST_BOXES.desktopShort, 8);
    expect(seatBoxOf(layout)).toEqual(SEAT_BOX.portrait);
    // Seven seats of 76 px stack at the ellipse's flanks in a 189 px arena, so the layout is the grid.
    expect(layout.kind).toBe('grid');
  });

  it('a taller arena never gets a smaller box, and the full box returns once it fits', () => {
    for (const seatCount of [3, 5, 7]) {
      const widths = Array.from({ length: 50 }, (_, step) => desktopSeatBox({ width: 1104, height: 150 + step * 10 }, seatCount).width);
      expect(widths).toEqual([...widths].sort((a, b) => a - b));
      expect(widths.at(-1)).toBe(SEAT_BOX.desktop.width);
      expect(widths[0]).toBeLessThan(SEAT_BOX.desktop.width);
    }
  });

  it('never goes below the portrait box, however short the arena', () => {
    expect(desktopSeatBox({ width: 1000, height: 120 }, 8)).toEqual(SEAT_BOX.portrait);
  });

  it('keeps the desktop box before the arena is measured', () => {
    expect(desktopSeatBox({ width: 0, height: 0 }, 4)).toEqual(SEAT_BOX.desktop);
  });

  it('draws a grid at the layout box, and the arrows trim to it', () => {
    const layout: SeatLayout = { kind: 'grid', mode: 'desktop', rows: [['p1', 'p2']], box: { width: 80, height: 96 } };
    expect(seatCenters(layout, { width: 1000, height: 120 })).toEqual([
      { playerId: 'p1', centerX: 500 - 44, centerY: SEAT_GRID_GAP_PX + 48 },
      { playerId: 'p2', centerX: 500 + 44, centerY: SEAT_GRID_GAP_PX + 48 },
    ]);
    expect(seatRect({ playerId: 'p1', centerX: 100, centerY: 100 }, 'desktop', layout.box)).toEqual({ left: 60, top: 52, width: 80, height: 96 });
  });
});
