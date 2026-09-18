/**
 * CSS/SVG Overview charts (Lot 62). Tokens only — no Chart.js / Recharts.
 */

import type { ReactElement } from 'react';

import {
  barWidthPercent,
  conicGradientFromSlices,
  layoutPieSlices,
  maxCount,
  scatterPlotXY,
} from '../../admin/admin-chart-math';
import { formatCount, formatPercent } from '../../admin/admin-present';

export interface AdminBarItem {
  id: string;
  label: string;
  value: number;
  display?: string;
}

export function AdminHorizontalBarChart({
  items,
  caption,
}: {
  items: readonly AdminBarItem[];
  caption?: string;
}): ReactElement {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No data</p>;
  }
  const max = maxCount(items.map((item) => item.value));
  return (
    <figure className="space-y-2">
      <ul className="space-y-2">
        {items.map((item) => {
          const width = barWidthPercent(item.value, max);
          return (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(5.5rem,9rem)_1fr_auto] items-center gap-2"
            >
              <span className="truncate text-xs text-ink" title={item.label}>
                {item.label}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-border-soft">
                <div
                  className="h-2.5 rounded-full bg-cta-purple"
                  style={{ width: `${String(width)}%` }}
                />
              </div>
              <span className="min-w-[3rem] text-right text-xs tabular-nums text-ink-muted">
                {item.display ?? formatCount(item.value)}
              </span>
            </li>
          );
        })}
      </ul>
      {caption !== undefined ? (
        <figcaption className="text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export interface AdminPieItem {
  id: string;
  label: string;
  value: number;
}

export function AdminPieChart({
  items,
  caption,
}: {
  items: readonly AdminPieItem[];
  caption?: string;
}): ReactElement {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No data</p>;
  }
  const slices = layoutPieSlices(items.map((item) => ({ id: item.id, count: item.value })));
  const gradient = conicGradientFromSlices(slices);
  return (
    <figure className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="relative mx-auto size-40 shrink-0 rounded-full"
        style={{ background: gradient }}
        role="img"
        aria-label={items.map((item) => `${item.label} ${formatCount(item.value)}`).join(', ')}
      >
        <div className="absolute inset-[22%] rounded-full bg-surface-raised" />
      </div>
      <ul className="space-y-1.5 text-xs text-ink">
        {items.map((item, index) => {
          const slice = slices[index];
          return (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ background: slice?.color ?? 'var(--color-border-soft)' }}
              />
              <span className="flex-1">{item.label}</span>
              <span className="tabular-nums text-ink-muted">{formatCount(item.value)}</span>
            </li>
          );
        })}
      </ul>
      {caption !== undefined ? (
        <figcaption className="text-xs text-ink-muted sm:basis-full">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export interface AdminScatterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

export function AdminScatterChart({
  points,
  xLabel,
  yLabel,
  caption,
}: {
  points: readonly AdminScatterPoint[];
  xLabel: string;
  yLabel: string;
  caption?: string;
}): ReactElement {
  return (
    <figure className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        className="w-full max-w-md rounded-[length:var(--radius-card)] border border-border bg-surface-raised"
        role="img"
        aria-label={`${yLabel} versus ${xLabel}`}
      >
        <line x1="8" y1="92" x2="92" y2="92" stroke="var(--color-border-soft)" strokeWidth="0.6" />
        <line x1="8" y1="8" x2="8" y2="92" stroke="var(--color-border-soft)" strokeWidth="0.6" />
        {points.map((point) => {
          const { x, y } = scatterPlotXY(point.x, point.y);
          return (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r="1.8"
              fill="var(--color-cta-purple)"
            >
              <title>
                {`${point.label}: pick ${formatPercent(point.x)}, win ${formatPercent(point.y)}`}
              </title>
            </circle>
          );
        })}
      </svg>
      <p className="text-xs text-ink-muted">
        {yLabel} × {xLabel}
      </p>
      {caption !== undefined ? (
        <figcaption className="text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function AdminBucketChart({
  items,
  caption,
}: {
  items: readonly AdminBarItem[];
  caption?: string;
}): ReactElement {
  return caption === undefined ? (
    <AdminHorizontalBarChart items={items} />
  ) : (
    <AdminHorizontalBarChart items={items} caption={caption} />
  );
}
