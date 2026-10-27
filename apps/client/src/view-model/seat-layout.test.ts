/**
 * Seat layout — Lot 73 (L73-03), technical spec v7 §6.4 (amended: one mode rule, arc order,
 * grid fallback), §14.3 (the box constants are L74 playtest starting values) and §12.2 (behavior
 * tests only). Coordinates are asserted relative to `SEAT_BOX` and `PLATE_BOX` where the result
 * is exact, so retuning a constant in L74 moves only the two tests that pin the 360-wide grid
 * switch (17, 18).
 */

import { describe, expect, it } from 'vitest';

import {
  PLATE_BOX,
  SEAT_BOX,
  SEAT_MIN_GAP_PX,
  layoutModeFor,
  layoutSeats,
  plateCenterFor,
  seatOrder,
  type LayoutBox,
  type SeatLayout,
  type SeatPlacement,
  type Size,
} from './seat-layout';
import { seats } from './seats';
import { makeTableView } from './test-fixtures';

const PHONE: LayoutBox = { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 320 } };
const PHONE_TALL: LayoutBox = { viewport: { width: 375, height: 812 }, arena: { width: 375, height: 360 } };
const TABLET: LayoutBox = { viewport: { width: 768, height: 1024 }, arena: { width: 768, height: 560 } };
const LANDSCAPE: LayoutBox = { viewport: { width: 740, height: 360 }, arena: { width: 740, height: 200 } };
const DESKTOP: LayoutBox = { viewport: { width: 1440, height: 900 }, arena: { width: 1000, height: 600 } };

const opponentIds = (count: number): string[] => Array.from({ length: count }, (_, i) => `p${i + 1}`);
const seatIds = (count: number): string[] => Array.from({ length: count }, (_, i) => `p${i}`);
/** The POV first in turn order, then `count` opponents. */
const seated = (count: number) => makeTableView(['me', ...opponentIds(count)]);
/** A walk-in spectator (L57-13) watching `count` seats p0…. */
const walkIn = (count: number) => makeTableView(seatIds(count), { you: 'watcher', isSpectator: true });

function placementsOf(layout: SeatLayout): readonly SeatPlacement[] {
  if (layout.kind !== 'arc') throw new Error(`expected an arc, got a ${layout.kind}`);
  return layout.placements;
}
function at<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new Error(`no item ${index}`);
  return item;
}
/** 1 when the centre is on the ellipse centred on the plate that touches the arena's top and sides. */
function ellipseResidual(p: SeatPlacement, mode: 'portrait' | 'desktop', arena: Size): number {
  const seat = SEAT_BOX[mode];
  const plate = plateCenterFor(mode, arena);
  const rx = plate.centerX - seat.width / 2;
  const ry = plate.centerY - seat.height / 2;
  return ((p.centerX - plate.centerX) / rx) ** 2 + ((p.centerY - plate.centerY) / ry) ** 2;
}

describe('layoutModeFor (technical spec v7 §6.4, amended)', () => {
  it.each([
    [360, 740, 'portrait'],
    [375, 812, 'portrait'],
    [768, 1024, 'portrait'],
    [740, 360, 'landscape-compact'],
    [1440, 900, 'desktop'],
    [1024, 600, 'desktop'],
  ] as const)('%i×%i is %s', (width, height, mode) => {
    expect(layoutModeFor({ width, height })).toBe(mode);
  });
});

describe('seatOrder (§6.4: the next player first, clockwise)', () => {
  it('2 seats: the one opponent', () => {
    expect(seatOrder(makeTableView(['p1', 'me']))).toEqual(['p1']);
  });

  it('4 seats: turnOrder rotated to start after the POV', () => {
    expect(seatOrder(makeTableView(['p1', 'p2', 'me', 'p3']))).toEqual(['p3', 'p1', 'p2']);
  });

  it('8 seats: turnOrder rotated to start after the POV', () => {
    expect(seatOrder(makeTableView(['p1', 'p2', 'p3', 'me', 'p4', 'p5', 'p6', 'p7']))).toEqual([
      'p4',
      'p5',
      'p6',
      'p7',
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('a walk-in has no anchor: every seat, from turnOrder[0]', () => {
    expect(seatOrder(walkIn(8))).toEqual(seatIds(8));
  });
});

describe('arc placement (§6.4)', () => {
  it('2 seats in portrait: the opponent sits at the top of the arc, above the plate', () => {
    const layout = layoutSeats(seated(1), PHONE);
    expect(layout.mode).toBe('portrait');
    const p1 = at(placementsOf(layout), 0);
    expect(p1.playerId).toBe('p1');
    expect(p1.centerX).toBeCloseTo(PHONE.arena.width / 2, 6);
    expect(p1.centerY).toBeCloseTo(SEAT_BOX.portrait.height / 2, 6);
    expect(plateCenterFor('portrait', PHONE.arena)).toEqual({
      centerX: 180,
      centerY: PHONE.arena.height - PLATE_BOX.portrait.height / 2,
    });
  });

  it('portrait, 4 opponents: next player first, left to right over the plate, on one ellipse', () => {
    const layout = layoutSeats(seated(4), PHONE);
    const placements = placementsOf(layout);
    expect(placements.map((p) => p.playerId)).toEqual(opponentIds(4));
    for (const p of placements) {
      expect(ellipseResidual(p, 'portrait', PHONE.arena)).toBeCloseTo(1, 6);
    }
    placements.forEach((p, i) => {
      if (i > 0) expect(p.centerX).toBeGreaterThan(at(placements, i - 1).centerX);
    });
    const [p0, p1, p2, p3] = [at(placements, 0), at(placements, 1), at(placements, 2), at(placements, 3)];
    expect(p0.centerX + p3.centerX).toBeCloseTo(360, 6);
    expect(p1.centerX + p2.centerX).toBeCloseTo(360, 6);
    expect(p0.centerY).toBeCloseTo(p3.centerY, 6);
    expect(p1.centerY).toBeCloseTo(p2.centerY, 6);
    expect(p1.centerY).toBeLessThan(p0.centerY);
    const plate = plateCenterFor('portrait', PHONE.arena);
    for (const p of placements) {
      expect(p.centerY).toBeLessThan(plate.centerY);
    }
  });

  it('desktop 1440×900: the full ellipse around the plate, the POV keeps the bottom slot', () => {
    const placements = placementsOf(layoutSeats(seated(7), DESKTOP));
    const plate = plateCenterFor('desktop', DESKTOP.arena);
    expect(plate).toEqual({ centerX: 500, centerY: 300 });
    expect(placements.map((p) => p.playerId)).toEqual(opponentIds(7));
    for (const p of placements) {
      expect(ellipseResidual(p, 'desktop', DESKTOP.arena)).toBeCloseTo(1, 6);
    }
    const first = at(placements, 0);
    expect(first.centerX).toBeLessThan(500);
    expect(first.centerY).toBeGreaterThan(300);
    const last = at(placements, 6);
    expect(last.centerX).toBeGreaterThan(500);
    expect(last.centerY).toBeGreaterThan(300);
    const top = at(placements, 3);
    expect(top.centerX).toBeCloseTo(500, 6);
    expect(top.centerY).toBeCloseTo(SEAT_BOX.desktop.height / 2, 6);
    expect(Math.max(...placements.map((p) => p.centerY))).toBeLessThan(
      DESKTOP.arena.height - SEAT_BOX.desktop.height / 2,
    );
  });

  it('landscape-compact 740×360: one top band of equal columns, no ellipse', () => {
    const layout = layoutSeats(seated(4), LANDSCAPE);
    const y = SEAT_BOX['landscape-compact'].height / 2;
    expect(layout).toEqual({
      kind: 'arc',
      mode: 'landscape-compact',
      placements: [
        { playerId: 'p1', centerX: 92.5, centerY: y },
        { playerId: 'p2', centerX: 277.5, centerY: y },
        { playerId: 'p3', centerX: 462.5, centerY: y },
        { playerId: 'p4', centerX: 647.5, centerY: y },
      ],
    });
  });

  it('a walk-in on desktop: 8 seats around the whole ellipse from turnOrder[0], none reserved', () => {
    const placements = placementsOf(layoutSeats(walkIn(8), DESKTOP));
    expect(placements.map((p) => p.playerId)).toEqual(seatIds(8));
    for (const p of placements) {
      expect(ellipseResidual(p, 'desktop', DESKTOP.arena)).toBeCloseTo(1, 6);
    }
    const p0 = at(placements, 0);
    const p7 = at(placements, 7);
    expect(p0.centerX + p7.centerX).toBeCloseTo(1000, 6);
    expect(p0.centerY).toBeCloseTo(p7.centerY, 6);
    expect(p0.centerY).toBeGreaterThan(300);
  });

  it('a walk-in in portrait: every seat on the upper arc from turnOrder[0]', () => {
    const placements = placementsOf(layoutSeats(walkIn(3), PHONE));
    expect(placements.map((p) => p.playerId)).toEqual(['p0', 'p1', 'p2']);
    for (const p of placements) {
      expect(ellipseResidual(p, 'portrait', PHONE.arena)).toBeCloseTo(1, 6);
    }
    placements.forEach((p, i) => {
      if (i > 0) expect(p.centerX).toBeGreaterThan(at(placements, i - 1).centerX);
    });
    const middle = at(placements, 1);
    expect(middle.centerX).toBeCloseTo(180, 6);
    expect(middle.centerY).toBeCloseTo(SEAT_BOX.portrait.height / 2, 6);
  });
});

describe('grid fallback (§6.4)', () => {
  it('7 opponents in a 360×740 portrait box fall back to 4 + 3 in turn order', () => {
    expect(layoutSeats(seated(7), PHONE)).toEqual({
      kind: 'grid',
      mode: 'portrait',
      rows: [
        ['p1', 'p2', 'p3', 'p4'],
        ['p5', 'p6', 'p7'],
      ],
    });
  });

  it('an 8-seat spectator view falls back to 4 + 4', () => {
    expect(layoutSeats(walkIn(8), PHONE)).toEqual({
      kind: 'grid',
      mode: 'portrait',
      rows: [
        ['p0', 'p1', 'p2', 'p3'],
        ['p4', 'p5', 'p6', 'p7'],
      ],
    });
  });

  it('the same 7 opponents stay on the arc at 1440×900', () => {
    expect(layoutSeats(seated(7), DESKTOP).kind).toBe('arc');
  });

  it('an arena smaller than one seat (a 0×0 first paint) uses the grid', () => {
    expect(
      layoutSeats(seated(2), { viewport: PHONE.viewport, arena: { width: 0, height: 0 } }),
    ).toEqual({ kind: 'grid', mode: 'portrait', rows: [['p1'], ['p2']] });
  });

  it('never leaves two arc seats closer than the gap, in any mode', () => {
    expect(SEAT_MIN_GAP_PX).toBe(8);
    let arcs = 0;
    for (const box of [PHONE, PHONE_TALL, TABLET, LANDSCAPE, DESKTOP]) {
      for (const view of [...[1, 2, 3, 4, 5, 6, 7].map(seated), walkIn(8)]) {
        const layout = layoutSeats(view, box);
        const order = seatOrder(view);
        if (layout.kind === 'grid') {
          expect(layout.rows.flat()).toEqual(order);
          expect(layout.rows.map((row) => row.length)).toEqual(
            [Math.ceil(order.length / 2), Math.floor(order.length / 2)].filter((n) => n > 0),
          );
          continue;
        }
        arcs += 1;
        const seat = SEAT_BOX[layout.mode];
        layout.placements.forEach((a, i) => {
          for (const b of layout.placements.slice(i + 1)) {
            const gap = Math.max(
              Math.abs(a.centerX - b.centerX) - seat.width,
              Math.abs(a.centerY - b.centerY) - seat.height,
            );
            expect(gap).toBeGreaterThanOrEqual(SEAT_MIN_GAP_PX);
          }
        });
      }
    }
    expect(arcs).toBeGreaterThan(20); // 33 with the L73 constants; guards against a vacuous loop
  });
});

describe('seats() (§4.3)', () => {
  it('returns the seat list plus its layout; 8 seats in a 360×740 box keep all four resources', () => {
    const view = seated(7);
    const model = seats(view, PHONE);
    expect(model.pov).toBe('seated');
    expect(model.seats.map((s) => s.playerId)).toEqual(opponentIds(7));
    expect(model.layout).toEqual(layoutSeats(view, PHONE));
    for (const seat of model.seats) {
      expect(seat.resources.map((r) => r.kind)).toEqual(['life', 'point', 'upgradePoint', 'shield']);
    }
  });
});
