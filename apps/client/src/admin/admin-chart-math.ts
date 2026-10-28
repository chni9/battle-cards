/**
 * Chart layout math for admin Overview (Lot 62). CSS/SVG only — no chart npm.
 * Colors are V7 palette hex (technical spec v7 §5.1, §7.8, L80-04): inline styles never take
 * `var()` (`ui/palette.ts`).
 */

import { V7_COLORS } from '../ui/palette';

/**
 * Series colors in paint order. Each is at least 3:1 on `--panel` (non-text contrast, WCAG
 * 1.4.11) and the eight are pairwise distinct. `--glow-a`, `--threat-attack`, `--mine`,
 * `--glow-b` and `--cta` are left out: the first four repeat `--life` / `--cta-2` values and
 * `--cta` sits ΔE2000 3.9 from `--point` (`docs/agent/decisions.md`, L80-04). Neighbours stay
 * at least 39 ΔE2000 apart; the closest pair overall (`--shield` / `--cta-2`, 13.5) is four
 * slices apart. A single series (bars, dots) uses the first.
 */
export const ADMIN_CHART_COLORS = [
  V7_COLORS['cta-2'],
  V7_COLORS.point,
  V7_COLORS.life,
  V7_COLORS.upgrade,
  V7_COLORS.shield,
  V7_COLORS['threat-other'],
  V7_COLORS['text-2'],
  V7_COLORS.danger,
] as const;

/** An empty pie ring and an unlisted legend swatch: `--panel-2`, a step above the chart panel. */
export const ADMIN_CHART_EMPTY_COLOR: string = V7_COLORS['panel-2'];

export function maxCount(values: readonly number[]): number {
  let max = 0;
  for (const value of values) {
    if (value > max) {
      max = value;
    }
  }
  return max;
}

/** Width 0–100. Zero max or non-positive count yields 0 (no divide). */
export function barWidthPercent(count: number, max: number): number {
  if (max <= 0 || count <= 0 || !Number.isFinite(count) || !Number.isFinite(max)) {
    return 0;
  }
  const pct = (count / max) * 100;
  if (pct > 100) {
    return 100;
  }
  return pct;
}

export function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

/** 0–1 rate → 0–100 along the axis. */
export function scatterPct(rate: number): number {
  return clampUnitInterval(rate) * 100;
}

export interface ScatterPlotXY {
  x: number;
  y: number;
}

/**
 * Plot coords in a square `size` with `inset` padding.
 * (0, 0) is bottom-left; (1, 1) is top-right (SVG y grows down).
 */
export function scatterPlotXY(
  xRate: number,
  yRate: number,
  inset = 8,
  size = 100,
): ScatterPlotXY {
  const inner = size - inset * 2;
  return {
    x: inset + (scatterPct(xRate) / 100) * inner,
    y: inset + ((100 - scatterPct(yRate)) / 100) * inner,
  };
}

export interface PieSliceLayout {
  id: string;
  sweepPct: number;
  startPct: number;
  color: string;
}

export function chartColorAt(index: number): string {
  const color = ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length];
  return color ?? ADMIN_CHART_COLORS[0];
}

export function layoutPieSlices(
  items: readonly { id: string; count: number }[],
): PieSliceLayout[] {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let start = 0;
  return items.map((item, index) => {
    const sweep = total <= 0 || item.count <= 0 ? 0 : (item.count / total) * 100;
    const slice: PieSliceLayout = {
      id: item.id,
      sweepPct: sweep,
      startPct: start,
      color: chartColorAt(index),
    };
    start += sweep;
    return slice;
  });
}

export function conicGradientFromSlices(slices: readonly PieSliceLayout[]): string {
  const painted = slices.filter((slice) => slice.sweepPct > 0);
  if (painted.length === 0) {
    return ADMIN_CHART_EMPTY_COLOR;
  }
  const stops = painted.map(
    (slice) => `${slice.color} ${String(slice.startPct)}% ${String(slice.startPct + slice.sweepPct)}%`,
  );
  return `conic-gradient(${stops.join(', ')})`;
}

export function sortByCountDesc<T>(
  rows: readonly T[],
  countOf: (row: T) => number,
  tieOf: (row: T) => string,
): T[] {
  return [...rows].sort((left, right) => {
    const delta = countOf(right) - countOf(left);
    if (delta !== 0) {
      return delta;
    }
    return tieOf(left).localeCompare(tieOf(right));
  });
}
