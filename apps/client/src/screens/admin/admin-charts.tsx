/**
 * CSS/SVG Overview charts (Lot 62), in the V7 palette (technical spec v7 §7.8, §5.1; L80-04).
 * No Chart.js / Recharts. Fills, rings and marks only: chart colors are never body text, so every
 * label stays `--text` or `--text-2`. Inline colors are hex from `admin-chart-math.ts` and
 * `ui/palette.ts`, never `var()`.
 */

import type { ReactElement } from 'react';

import {
  ADMIN_CHART_COLORS,
  ADMIN_CHART_EMPTY_COLOR,
  barWidthPercent,
  conicGradientFromSlices,
  layoutPieSlices,
  maxCount,
  scatterPlotXY,
} from '../../admin/admin-chart-math';
import { formatCount, formatPercent } from '../../admin/admin-present';
import { V7_TOOL_LINE } from '../../ui/palette';
import { ADMIN_BODY_TEXT_CLASS, ADMIN_NOTE_CLASS } from './admin-classes';

/** Chart labels and legend rows: Nunito at the 12 px caption step (spec v7 §5.2 table text). */
const CHART_LABEL_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text';
const NO_DATA_CLASS = `${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`;

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
    return <p className={NO_DATA_CLASS}>No data</p>;
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
              <span className={`truncate ${CHART_LABEL_CLASS}`} title={item.label}>
                {item.label}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-v7-panel-2">
                <div
                  className="h-2.5 rounded-full bg-v7-cta-2"
                  style={{ width: `${String(width)}%` }}
                />
              </div>
              <span className={`min-w-[3rem] text-right tabular-nums ${ADMIN_NOTE_CLASS}`}>
                {item.display ?? formatCount(item.value)}
              </span>
            </li>
          );
        })}
      </ul>
      {caption !== undefined ? (
        <figcaption className={ADMIN_NOTE_CLASS}>{caption}</figcaption>
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
    return <p className={NO_DATA_CLASS}>No data</p>;
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
        <div className="absolute inset-[22%] rounded-full bg-v7-panel" />
      </div>
      <ul className={`space-y-1.5 ${CHART_LABEL_CLASS}`}>
        {items.map((item, index) => {
          const slice = slices[index];
          return (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ background: slice?.color ?? ADMIN_CHART_EMPTY_COLOR }}
              />
              <span className="flex-1">{item.label}</span>
              <span className={`tabular-nums ${ADMIN_NOTE_CLASS}`}>{formatCount(item.value)}</span>
            </li>
          );
        })}
      </ul>
      {caption !== undefined ? (
        <figcaption className={`${ADMIN_NOTE_CLASS} sm:basis-full`}>{caption}</figcaption>
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
        className="w-full max-w-md"
        role="img"
        aria-label={`${yLabel} versus ${xLabel}`}
      >
        {/* 1 px lines at any size (`non-scaling-stroke`): the tool-mode edge, spec v7 §7.8. */}
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="1.5"
          fill="none"
          stroke={V7_TOOL_LINE}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="8"
          y1="92"
          x2="92"
          y2="92"
          stroke={V7_TOOL_LINE}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="8"
          y1="8"
          x2="8"
          y2="92"
          stroke={V7_TOOL_LINE}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => {
          const { x, y } = scatterPlotXY(point.x, point.y);
          return (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r="1.8"
              fill={ADMIN_CHART_COLORS[0]}
            >
              <title>
                {`${point.label}: pick ${formatPercent(point.x)}, win ${formatPercent(point.y)}`}
              </title>
            </circle>
          );
        })}
      </svg>
      <p className={ADMIN_NOTE_CLASS}>
        {yLabel} × {xLabel}
      </p>
      {caption !== undefined ? (
        <figcaption className={ADMIN_NOTE_CLASS}>{caption}</figcaption>
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
