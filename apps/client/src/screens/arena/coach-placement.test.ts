/**
 * The tutorial coach's slot: designer 2026-11-06 (Check 2 stop item S4), over technical spec v7 §6.12
 * and Lot 75 plan K8 (the coach's default is the arena's top-left corner).
 */
import { describe, expect, it } from 'vitest';

import type { Rect } from '../../view-model/drop-target';
import { COACH_INSET_PX, COACH_MARK_CLEARANCE_PX, placeCoach, type CoachPlacementInput } from './coach-placement';

/** A 375×812 phone's arena region and the coach panel at `min(22rem, 100% − 1rem)` wide. */
const ARENA: Rect = { left: 0, top: 100, width: 375, height: 282 };
const COACH = { width: 352, height: 130 };
const place = (marks: readonly Rect[], arena: Rect = ARENA) => placeCoach({ coach: COACH, arena, marks });

describe('placeCoach (S4)', () => {
  it('stays at the arena top-left, 8 px in, with no mark or a mark elsewhere (K8)', () => {
    const top = { edge: 'top', top: ARENA.top + COACH_INSET_PX, left: ARENA.left + COACH_INSET_PX };
    expect(place([])).toEqual(top);
    // The hand mark sits under the arena: it never touches the default box.
    expect(place([{ left: 0, top: 600, width: 375, height: 120 }])).toEqual(top);
  });

  it('flips to the arena bottom edge when the marked element overlaps the default box', () => {
    const bottom = { edge: 'bottom', top: ARENA.top + ARENA.height - COACH_INSET_PX - COACH.height, left: ARENA.left + COACH_INSET_PX };
    // The opponent seat at 375×812 sits under the default box.
    expect(place([{ left: 150, top: 110, width: 76, height: 92 }])).toEqual(bottom);
  });

  it('counts the ring and the arrow around the mark: a mark just above the box still flips it', () => {
    const boxTop = ARENA.top + COACH_INSET_PX;
    const above = (gap: number): Rect => ({ left: 100, top: boxTop - gap - 40, width: 60, height: 40 });
    expect(place([above(4)]).edge).toBe('bottom');
    expect(place([above(COACH_MARK_CLEARANCE_PX)]).edge).toBe('top');
  });

  it('flips for any one of several marks', () => {
    expect(place([{ left: 0, top: 600, width: 50, height: 50 }, { left: 20, top: 120, width: 50, height: 50 }]).edge).toBe('bottom');
  });

  it('keeps the default when the bottom edge would cover the mark at least as much', () => {
    // The plate sits at the bottom of the arena and the seat at the top: each position covers one.
    const plate: Rect = { left: 128, top: 300, width: 120, height: 82 };
    const seat: Rect = { left: 150, top: 110, width: 76, height: 92 };
    expect(place([plate]).edge).toBe('top');
    expect(place([plate, seat]).edge).toBe('top');
    expect(place([seat]).edge).toBe('bottom');
  });

  it('keeps the bottom position inside the arena, clear of the band under it, even for a tall coach', () => {
    const seat: Rect = { left: 150, top: 110, width: 76, height: 92 };
    const flipped = place([seat]);
    expect([flipped.edge, flipped.top + COACH.height]).toEqual(['bottom', ARENA.top + ARENA.height - COACH_INSET_PX]);
    // A coach taller than the arena cannot clear either edge: it keeps its top inside the arena.
    const tall = placeCoach({ coach: { width: 352, height: 400 }, arena: ARENA, marks: [seat] });
    expect(tall.top).toBeGreaterThanOrEqual(ARENA.top + COACH_INSET_PX);
  });

  it('follows the arena region: the same marks at another arena offset', () => {
    const arena: Rect = { left: 40, top: 56, width: 1104, height: 489 };
    expect(place([], arena)).toEqual({ edge: 'top', top: 64, left: 48 });
  });

  describe('the slot under the opponents (Q2-5)', () => {
    const seat: Rect = { left: 150, top: 110, width: 76, height: 92 };
    const plate: Rect = { left: 128, top: 300, width: 120, height: 82 };
    /** The opponent row at 375×812: the seat's own rect. */
    const opponents = seat;
    const underTop = seat.top + seat.height + COACH_MARK_CLEARANCE_PX;

    it('goes under the opponent row when the top-left and the bottom slots both overlap the marks', () => {
      // The seat is under the top-left box, the Incoming plate under the bottom one.
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [plate, seat], opponents })).toEqual({
        edge: 'under-opponents',
        top: underTop,
        left: ARENA.left + COACH_INSET_PX,
      });
    });

    it('leaves the two-slot result alone when the top-left is clear', () => {
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [], opponents }).edge).toBe('top');
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [{ left: 0, top: 600, width: 375, height: 120 }], opponents }).edge).toBe('top');
    });

    it('leaves the two-slot result alone when the bottom slot is clear or covers less', () => {
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [seat], opponents }).edge).toBe('bottom');
    });

    it('keeps the two-slot result without an opponent row', () => {
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [plate, seat] })).toEqual(place([plate, seat]));
      expect(place([plate, seat]).edge).toBe('top');
    });

    it('stays put when the slot under the opponents would hide the marks as much', () => {
      const band: Rect = { left: 0, top: underTop, width: 375, height: ARENA.top + ARENA.height - underTop };
      expect(placeCoach({ coach: COACH, arena: ARENA, marks: [seat, band], opponents }).edge).toBe('top');
    });

    it('never moves for nothing: an opponent row above the arena clamps to the top-left, which is not a move', () => {
      // The raw slot (row bottom + clearance) is above the arena; clamped, it is the top-left box, covering
      // the marks exactly as much, so the coach stays at `top` and never rises above the arena.
      const above: Rect = { left: 150, top: 0, width: 76, height: 50 };
      const placed = placeCoach({ coach: COACH, arena: ARENA, marks: [plate, seat], opponents: above });
      expect(placed).toEqual({ edge: 'top', top: ARENA.top + COACH_INSET_PX, left: ARENA.left + COACH_INSET_PX });
    });

    it('keeps the slot inside the arena, whatever the opponent row', () => {
      const low: Rect = { left: 150, top: 300, width: 76, height: 92 };
      const placed = placeCoach({ coach: COACH, arena: ARENA, marks: [plate, low, seat], opponents: low });
      expect(placed.top + COACH.height).toBeLessThanOrEqual(ARENA.top + ARENA.height - COACH_INSET_PX);
      expect(placed.top).toBeGreaterThanOrEqual(ARENA.top + COACH_INSET_PX);
    });
  });
});

/**
 * The tour's slots leave the arena (designer 2026-11-06, Gate B stop item S-B1, option b): the table is
 * locked, so the coach may sit over the self strip and the hand. Measured geometry from Gate B.
 */
describe('placeCoach during the tour (S-B1)', () => {
  /** 375×812: the arena region is 135–417 and the Incoming coach 237 px tall. */
  const PHONE = {
    viewport: { left: 0, top: 0, width: 375, height: 812 } satisfies Rect,
    arena: { left: 0, top: 135, width: 375, height: 282 } satisfies Rect,
    coach: { width: 352, height: 237 },
    plate: { left: 128, top: 335, width: 120, height: 82 } satisfies Rect,
    seat: { left: 150, top: 145, width: 76, height: 92 } satisfies Rect,
  };
  /** 360×740: the arena region is 135–349 and the coach 214 px tall. */
  const SMALL = {
    viewport: { left: 0, top: 0, width: 360, height: 740 } satisfies Rect,
    arena: { left: 0, top: 135, width: 360, height: 214 } satisfies Rect,
    coach: { width: 344, height: 214 },
    plate: { left: 120, top: 262, width: 120, height: 87 } satisfies Rect,
    seat: { left: 142, top: 145, width: 76, height: 92 } satisfies Rect,
  };
  const HAND: Rect = { left: 0, top: 560, width: 375, height: 140 };
  /** The share of `marks` (with the callout reach) the placed coach covers. */
  const cover = (input: CoachPlacementInput, marks: readonly Rect[]): number => {
    const placed = placeCoach(input);
    const box = { left: placed.left, top: placed.top, width: input.coach.width, height: input.coach.height };
    return marks.reduce((sum, mark) => {
      const reach = { left: mark.left - COACH_MARK_CLEARANCE_PX, top: mark.top - COACH_MARK_CLEARANCE_PX, width: mark.width + 40, height: mark.height + 40 };
      const width = Math.min(box.left + box.width, reach.left + reach.width) - Math.max(box.left, reach.left);
      const height = Math.min(box.top + box.height, reach.top + reach.height) - Math.max(box.top, reach.top);
      return sum + (width > 0 && height > 0 ? width * height : 0);
    }, 0);
  };
  const tour = (g: typeof PHONE, marks: readonly Rect[], opponents?: Rect): CoachPlacementInput => ({
    coach: g.coach, arena: g.arena, marks, bounds: 'viewport', viewport: g.viewport, ...(opponents !== undefined ? { opponents } : {}),
  });
  const script = (g: typeof PHONE, marks: readonly Rect[], opponents?: Rect): CoachPlacementInput => ({
    coach: g.coach, arena: g.arena, marks, ...(opponents !== undefined ? { opponents } : {}),
  });

  it('covers the Incoming mark 0% at 375×812, where the arena-only slots covered it', () => {
    const marks = [PHONE.plate];
    expect(cover(script(PHONE, marks, PHONE.seat), marks)).toBeGreaterThan(0);
    expect(cover(tour(PHONE, marks, PHONE.seat), marks)).toBe(0);
    // The top slot is the viewport's top edge, 8 px in.
    expect(placeCoach(tour(PHONE, marks, PHONE.seat))).toEqual({ edge: 'top', top: COACH_INSET_PX, left: COACH_INSET_PX });
  });

  it('puts the coach on the viewport bottom edge for the Opponent mark, over the locked hand', () => {
    const marks = [PHONE.seat];
    expect(cover(script(PHONE, marks, PHONE.seat), marks)).toBeGreaterThan(0);
    expect(cover(tour(PHONE, marks, PHONE.seat), marks)).toBe(0);
    expect(placeCoach(tour(PHONE, marks, PHONE.seat))).toEqual({
      edge: 'bottom', top: 812 - COACH_INSET_PX - PHONE.coach.height, left: COACH_INSET_PX,
    });
  });

  it('takes the slot under the opponents when the top and bottom edges both hide a mark', () => {
    const marks = [PHONE.seat, HAND];
    const placed = placeCoach(tour(PHONE, marks, PHONE.seat));
    expect(placed).toEqual({ edge: 'under-opponents', top: PHONE.seat.top + PHONE.seat.height + COACH_MARK_CLEARANCE_PX, left: COACH_INSET_PX });
    expect(cover(tour(PHONE, marks, PHONE.seat), marks)).toBe(0);
  });

  it('breaks a tie in the order top, bottom, under', () => {
    // A mark spanning the whole viewport is covered equally by every slot of the same coach.
    const everything: Rect = { left: 0, top: 0, width: 375, height: 812 };
    expect(placeCoach(tour(PHONE, [], PHONE.seat)).edge).toBe('top');
    expect(placeCoach(tour(PHONE, [everything], PHONE.seat)).edge).toBe('top');
    // Top covers the seat; bottom and under cover it equally (nothing): bottom wins over under.
    expect(placeCoach(tour(PHONE, [PHONE.seat], PHONE.seat)).edge).toBe('bottom');
  });

  it('keeps the coach inside the viewport, even beside an offset arena', () => {
    const placed = placeCoach({ ...tour(PHONE, [PHONE.seat], PHONE.seat), arena: { ...PHONE.arena, left: 40 } });
    expect(placed.left).toBeGreaterThanOrEqual(0);
    expect(placed.left + PHONE.coach.width).toBeLessThanOrEqual(375);
    expect(placed.top).toBeGreaterThanOrEqual(0);
    expect(placed.top + 237).toBeLessThanOrEqual(812);
  });

  it('on a script step keeps the coach inside the arena, so the hand and the dock stay free', () => {
    for (const marks of [[PHONE.plate], [PHONE.seat], [PHONE.seat, PHONE.plate]]) {
      const placed = placeCoach(script(PHONE, marks, PHONE.seat));
      expect(placed.top).toBeGreaterThanOrEqual(PHONE.arena.top + COACH_INSET_PX);
      expect(placed.top + PHONE.coach.height).toBeLessThanOrEqual(Math.max(PHONE.arena.top + COACH_INSET_PX + PHONE.coach.height, PHONE.arena.top + PHONE.arena.height - COACH_INSET_PX));
      expect(placed.top).toBeLessThan(PHONE.arena.top + PHONE.arena.height);
    }
    // The measured case: the arena-only coach stays at the top-left of the arena, covering the Incoming mark.
    expect(placeCoach(script(PHONE, [PHONE.plate], PHONE.seat))).toEqual({ edge: 'top', top: PHONE.arena.top + COACH_INSET_PX, left: COACH_INSET_PX });
  });

  it('clears the Incoming and Opponent marks and the Action log arrow at 360×740', () => {
    const log: Rect = { left: 0, top: 98, width: 360, height: 40 };
    for (const marks of [[SMALL.plate], [SMALL.seat], [log]]) {
      expect(cover(script(SMALL, marks, SMALL.seat), marks)).toBeGreaterThan(0);
      expect(cover(tour(SMALL, marks, SMALL.seat), marks)).toBe(0);
    }
    const placed = placeCoach(tour(SMALL, [SMALL.seat], SMALL.seat));
    expect(placed.top + SMALL.coach.height).toBeLessThanOrEqual(740 - COACH_INSET_PX);
  });
});
