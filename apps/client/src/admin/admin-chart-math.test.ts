import { describe, expect, it } from 'vitest';

import {
  barWidthPercent,
  conicGradientFromSlices,
  layoutPieSlices,
  maxCount,
  scatterPlotXY,
  scatterPct,
  sortByCountDesc,
} from './admin-chart-math';

describe('admin chart math (L62-05)', () => {
  it('returns 0 width for empty, zero, and non-positive max', () => {
    expect(barWidthPercent(0, 10)).toBe(0);
    expect(barWidthPercent(5, 0)).toBe(0);
    expect(barWidthPercent(-1, 10)).toBe(0);
    expect(barWidthPercent(4, 8)).toBe(50);
    expect(barWidthPercent(8, 8)).toBe(100);
    expect(barWidthPercent(12, 8)).toBe(100);
    expect(maxCount([])).toBe(0);
    expect(maxCount([0, 0])).toBe(0);
    expect(maxCount([1, 4, 2])).toBe(4);
  });

  it('lays out pie slices including all-zero', () => {
    expect(layoutPieSlices([])).toEqual([]);
    const zeros = layoutPieSlices([
      { id: 'a', count: 0 },
      { id: 'b', count: 0 },
    ]);
    expect(zeros.map((slice) => slice.sweepPct)).toEqual([0, 0]);
    expect(conicGradientFromSlices(zeros)).toBe('var(--color-border-soft)');

    const halves = layoutPieSlices([
      { id: 'a', count: 2 },
      { id: 'b', count: 2 },
    ]);
    expect(halves[0]?.sweepPct).toBe(50);
    expect(halves[1]?.startPct).toBe(50);
    expect(conicGradientFromSlices(halves)).toContain('conic-gradient');
  });

  it('plots scatter 0/0 at bottom-left and 1/1 at top-right', () => {
    expect(scatterPct(-1)).toBe(0);
    expect(scatterPct(0)).toBe(0);
    expect(scatterPct(1)).toBe(100);
    expect(scatterPct(2)).toBe(100);
    const origin = scatterPlotXY(0, 0, 8, 100);
    expect(origin).toEqual({ x: 8, y: 92 });
    const topRight = scatterPlotXY(1, 1, 8, 100);
    expect(topRight).toEqual({ x: 92, y: 8 });
  });

  it('sorts counts descending with a stable id tie-break', () => {
    expect(
      sortByCountDesc(
        [
          { id: 'b', count: 1 },
          { id: 'a', count: 3 },
          { id: 'c', count: 3 },
        ],
        (row) => row.count,
        (row) => row.id,
      ).map((row) => row.id),
    ).toEqual(['a', 'c', 'b']);
  });
});
