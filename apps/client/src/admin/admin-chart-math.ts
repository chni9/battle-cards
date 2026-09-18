/**
 * Chart layout math for admin Overview (Lot 62). CSS/SVG only — no chart npm.
 */

export const ADMIN_CHART_COLOR_VARS = [
  'var(--color-cta-purple)',
  'var(--color-cta-orange)',
  'var(--color-resource-life)',
  'var(--color-resource-shield)',
  'var(--color-resource-upgrade)',
  'var(--color-resource-point)',
  'var(--color-seat-0)',
  'var(--color-seat-6)',
] as const;

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
  const color = ADMIN_CHART_COLOR_VARS[index % ADMIN_CHART_COLOR_VARS.length];
  return color ?? 'var(--color-cta-purple)';
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
    return 'var(--color-border-soft)';
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
