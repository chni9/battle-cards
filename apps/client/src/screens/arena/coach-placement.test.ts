/**
 * The tutorial coach's slot: designer 2026-11-06 (Check 2 stop item S4), over technical spec v7 §6.12
 * and Lot 75 plan K8 (the coach's default is the arena's top-left corner).
 */
import { describe, expect, it } from 'vitest';

import type { Rect } from '../../view-model/drop-target';
import { COACH_INSET_PX, COACH_MARK_CLEARANCE_PX, placeCoach } from './coach-placement';

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

    it('keeps the slot inside the arena, whatever the opponent row', () => {
      const low: Rect = { left: 150, top: 300, width: 76, height: 92 };
      const placed = placeCoach({ coach: COACH, arena: ARENA, marks: [plate, low, seat], opponents: low });
      expect(placed.top + COACH.height).toBeLessThanOrEqual(ARENA.top + ARENA.height - COACH_INSET_PX);
      expect(placed.top).toBeGreaterThanOrEqual(ARENA.top + COACH_INSET_PX);
    });
  });
});
