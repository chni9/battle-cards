/** Seat geometry: spec v7 §6.4 (arc placements, grid rows `ceil(n/2)` over `floor(n/2)`, 8 px gap), L74-04. */
import { describe, expect, it } from 'vitest';

import { SEAT_BOX, type SeatLayout } from '../../view-model/seat-layout';
import { SEAT_GRID_GAP_PX, SEAT_RENDER_BOX, seatCenters, seatRect, seatRenderBox } from './seat-geometry';

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
