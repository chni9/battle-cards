/**
 * Threat arrow geometry — technical spec v7 §6.5 (one arrow and one label per pending effect,
 * fanned side by side; hits-all plays as one burst plus a badge per target seat; grid mode draws
 * only the POV's arrows plus the tapped seat's; ends and colours); L74-06.
 *
 * Pure and DOM-free: seats come from the same `seatCenters` the seats are drawn at (L74-04), and
 * the POV's anchor is the central plate (`plateCenterFor`), for incoming ends and outgoing starts
 * alike. Every arrow keeps its own label: arrows are never merged and amounts never summed
 * (golden rule 1, designer 2026-09-29).
 */

import { V7_COLORS, v7SeatColor } from '../../ui/palette';
import type { Point } from '../../view-model/drop-target';
import { plateCenterFor, type LayoutMode, type SeatLayout, type Size } from '../../view-model/seat-layout';
import {
  gridThreatEntries,
  seatThreatIds,
  type FanOutGroup,
  type ThreatEntry,
  type ThreatEntryTone,
  type ThreatLabel,
  type ThreatsModel,
} from '../../view-model/threats';
import { seatCenters, seatRenderBox } from './seat-geometry';

/** Clear space between an arrow's end and the seat's edge (it gave the 76 px seat its 40 px trim at the Lot 74 browser gate). */
export const ARROW_SEAT_GAP_PX = 2;
/**
 * Where an arrow leaves or reaches a seat: half the drawn seat's width plus `ARROW_SEAT_GAP_PX`, so
 * the shaft and the head stop at the seat's edge in every mode. The portrait and landscape seats are
 * 76 px wide (40 px, as tuned at the Lot 74 gate); the desktop seat is 120 px wide (62 px), where a
 * 40 px trim drew the head over the resource chips (Lot 75 Check 1).
 */
export function arrowSeatTrimPx(mode: LayoutMode, box?: Size): number {
  return seatRenderBox(mode, box).width / 2 + ARROW_SEAT_GAP_PX;
}
/** Where an arrow leaves or reaches the plate. */
export const ARROW_PLATE_TRIM_PX = 44;
/** The side step between arrows fanned between one seat pair. */
export const ARROW_FAN_SPACING_PX = 12;
/** The head's length along the arrow. */
export const ARROW_HEAD_PX = 8;
/** Half the head's width across the arrow. */
export const ARROW_HEAD_HALF_PX = 5;
/** How far a hits-all target badge sits inside its seat's top-right corner. */
export const FAN_BADGE_INSET_PX = 10;

export interface ArrowGeometry {
  /** The shaft, `M x y L x y`, ending where the head starts. */
  d: string;
  /** The head triangle, `M tip L corner L corner Z`. */
  head: string;
  /** The label's centre: the trimmed segment's midpoint. */
  label: Point;
}

/** Two decimals; `String` prints -0 as `0`. */
function f(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function pathPoint(point: Point): string {
  return `${f(point.x)} ${f(point.y)}`;
}

/**
 * A straight arrow from `from` to `to`, trimmed at both ends and shifted `offset` px to the left
 * of travel. Null when the trims and the head leave no shaft (which covers two equal points):
 * two adjacent grid seats, 84 px apart with 2 × 40 px of trims, draw no arrow (decisions.md
 * 2026-10-28 "V7 threat arrows and central plate").
 */
export function arrowPath(
  from: Point,
  to: Point,
  options: { trimStart: number; trimEnd: number; offset: number },
): ArrowGeometry | null {
  const { trimStart, trimEnd, offset } = options;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= trimStart + trimEnd + ARROW_HEAD_PX) {
    return null;
  }
  const u = { x: dx / length, y: dy / length };
  // The left of travel on a y-down screen.
  const n = { x: u.y, y: -u.x };
  const start = { x: from.x + u.x * trimStart + n.x * offset, y: from.y + u.y * trimStart + n.y * offset };
  const end = { x: to.x - u.x * trimEnd + n.x * offset, y: to.y - u.y * trimEnd + n.y * offset };
  const shaftEnd = { x: end.x - u.x * ARROW_HEAD_PX, y: end.y - u.y * ARROW_HEAD_PX };
  const cornerA = { x: shaftEnd.x + n.x * ARROW_HEAD_HALF_PX, y: shaftEnd.y + n.y * ARROW_HEAD_HALF_PX };
  const cornerB = { x: shaftEnd.x - n.x * ARROW_HEAD_HALF_PX, y: shaftEnd.y - n.y * ARROW_HEAD_HALF_PX };
  return {
    d: `M ${pathPoint(start)} L ${pathPoint(shaftEnd)}`,
    head: `M ${pathPoint(end)} L ${pathPoint(cornerA)} L ${pathPoint(cornerB)} Z`,
    label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

export interface ThreatGeometryInput {
  model: ThreatsModel;
  layout: SeatLayout;
  arena: Size;
  povId: string;
  tappedSeatId: string | null;
}

export interface ThreatArrow {
  entry: ThreatEntry;
  /** Untrimmed anchors: a seat centre, or the plate centre for the POV. */
  from: Point;
  to: Point;
  geometry: ArrowGeometry;
  /** null while no seat is tapped; else whether the tapped seat sends or receives it. */
  highlighted: boolean | null;
}

/** Seat centres by id, plus the POV at the plate centre (it has no seat in the arena). */
function anchorsOf(layout: SeatLayout, arena: Size, povId: string): ReadonlyMap<string, Point> {
  const anchors = new Map<string, Point>(
    seatCenters(layout, arena).map((center) => [center.playerId, { x: center.centerX, y: center.centerY }]),
  );
  const plate = plateCenterFor(layout.mode, arena);
  anchors.set(povId, { x: plate.centerX, y: plate.centerY });
  return anchors;
}

/** The unordered seat pair: both directions between two seats fan in one group. */
function pairKey(entry: ThreatEntry): string {
  const { sourcePlayerId: source, targetPlayerId: target } = entry;
  return source < target ? `${source}|${target}` : `${target}|${source}`;
}

/**
 * One arrow per drawn pending effect, in wire order. Fan-out members draw as a burst
 * (`fanOutMarks`) and a self-queued effect has no route, so neither gets an arrow. Arrows
 * between one seat pair fan side by side whichever way they point, so a mutual pair or a mixed
 * Assassin volley never lies on one line (decisions.md 2026-10-28).
 */
export function threatArrows(input: ThreatGeometryInput): readonly ThreatArrow[] {
  const { model, layout, arena, povId, tappedSeatId } = input;
  const anchors = anchorsOf(layout, arena, povId);
  const candidates = layout.kind === 'grid' ? gridThreatEntries(model, povId, tappedSeatId) : model.entries;
  const visible = candidates.flatMap((entry) => {
    if (entry.fanOutKey !== null || entry.sourcePlayerId === entry.targetPlayerId) {
      return [];
    }
    const from = anchors.get(entry.sourcePlayerId);
    const to = anchors.get(entry.targetPlayerId);
    return from === undefined || to === undefined ? [] : [{ entry, from, to }];
  });

  const pairs = new Map<string, string[]>();
  for (const { entry } of visible) {
    const key = pairKey(entry);
    const ids = pairs.get(key);
    if (ids === undefined) {
      pairs.set(key, [entry.effectId]);
    } else {
      ids.push(entry.effectId);
    }
  }

  const tapped =
    tappedSeatId === null
      ? null
      : (() => {
          const { incoming, outgoing } = seatThreatIds(model, tappedSeatId);
          return new Set([...incoming, ...outgoing]);
        })();

  const seatTrim = arrowSeatTrimPx(layout.mode, layout.box);
  return visible.flatMap(({ entry, from, to }) => {
    const ids = pairs.get(pairKey(entry)) ?? [entry.effectId];
    const canonical = (ids.indexOf(entry.effectId) - (ids.length - 1) / 2) * ARROW_FAN_SPACING_PX;
    // The offset is to the left of travel: negating it for the reverse direction keeps every
    // arrow of a pair on one screen side per index.
    const offset = entry.sourcePlayerId < entry.targetPlayerId ? canonical : -canonical;
    const geometry = arrowPath(from, to, {
      trimStart: entry.sourcePlayerId === povId ? ARROW_PLATE_TRIM_PX : seatTrim,
      trimEnd: entry.targetPlayerId === povId ? ARROW_PLATE_TRIM_PX : seatTrim,
      offset,
    });
    if (geometry === null) {
      return [];
    }
    return [{ entry, from, to, geometry, highlighted: tapped === null ? null : tapped.has(entry.effectId) }];
  });
}

export interface FanOutMark {
  group: FanOutGroup;
  /** The source seat's centre, or the plate for the POV. */
  burst: Point;
  /** One badge per copy aimed at a seat other than the POV's (the plate shows the POV's), at that seat's top-right corner. */
  targets: readonly { playerId: string; effectId: string; label: ThreatLabel; at: Point }[];
}

/** One "hits all" burst per fan-out group, in `model.fanOuts` order, with its target seat badges. */
export function fanOutMarks(input: Omit<ThreatGeometryInput, 'tappedSeatId'>): readonly FanOutMark[] {
  const { model, layout, arena, povId } = input;
  const anchors = anchorsOf(layout, arena, povId);
  // The badge corner of the seat as drawn in this mode (L75-02).
  const { width, height } = seatRenderBox(layout.mode, layout.box);
  return model.fanOuts.flatMap((group) => {
    const burst = anchors.get(group.sourcePlayerId);
    if (burst === undefined) {
      return [];
    }
    const targets = group.targets.flatMap((target) => {
      if (target.playerId === povId) {
        return [];
      }
      const center = anchors.get(target.playerId);
      if (center === undefined) {
        return [];
      }
      const at = { x: center.x + width / 2 - FAN_BADGE_INSET_PX, y: center.y - height / 2 + FAN_BADGE_INSET_PX };
      return [{ playerId: target.playerId, effectId: target.effectId, label: target.label, at }];
    });
    return [{ group, burst, targets }];
  });
}

/** Stroke hex: incoming = tone (`--threat-attack` / `--threat-other`), outgoing = `--mine`, third party = the source seat hue. */
export function arrowStroke(entry: ThreatEntry): string {
  if (entry.relation === 'third-party') {
    // `v7SeatColor` clamps: `seatColorIndexOf` can return 8 or more (ruling A.8.9).
    return v7SeatColor(entry.sourceSeatColorIndex);
  }
  switch (entry.tone) {
    case 'mine':
      return V7_COLORS.mine;
    case 'attack':
      return V7_COLORS['threat-attack'];
    case 'effect':
      return V7_COLORS['threat-other'];
  }
}

/**
 * The inset tone ring of an arrow label or a plate badge. A third-party label keeps its tone
 * while its arrow takes the source seat hue ("a tone-coded icon", §6.5).
 */
export const THREAT_TONE_RING_CLASS: Readonly<Record<ThreatEntryTone, string>> = {
  attack: 'ring-v7-threat-attack',
  effect: 'ring-v7-threat-other',
  mine: 'ring-v7-mine',
};

/** A Mirror-eligible label or plate badge while the prompt is open: a 3 px `--cta-2` outline (§6.5). */
export const MIRROR_ELIGIBLE_CLASS = 'outline-3 outline-v7-cta-2';
