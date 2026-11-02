/**
 * V7 "Arcade Holo" palette (technical spec v7 §5.1), mirrored from `ui/tokens.css`;
 * `ui/palette.test.ts` proves the two declare the same values.
 *
 * Inline styles take these hex values, never `var()` or `color-mix()`: mobile Safari
 * painted theme variables gray in V2 (see `ui/seat-colors.ts`). Classes may use the
 * `bg-v7-*` / `text-v7-*` utilities instead. `ink` is outline and shadow only, never text;
 * labels on CTA fills use `text-on-cta`.
 */

import { clampSeatIndex } from './seat-colors';

export const V7_COLORS = {
  'bg-0': '#0c0920',
  'bg-1': '#17113a',
  'glow-a': '#ff3d7f',
  'glow-b': '#3da9ff',
  panel: '#1f1850',
  'panel-2': '#2b2256',
  ink: '#0c0920',
  text: '#f3eeff',
  'text-2': '#cfc6ff',
  'text-on-card': '#2a2550',
  'text-on-cta': '#0c0920',
  life: '#ff3d7f',
  point: '#ffc93d',
  upgrade: '#3dcf8f',
  shield: '#6b8cff',
  cta: '#ffd43d',
  'cta-2': '#3da9ff',
  danger: '#ff4d4d',
  'threat-attack': '#ff3d7f',
  'threat-other': '#ffa53d',
  mine: '#3da9ff',
  'card-face-0': '#ffffff',
  'card-face-1': '#f1edff',
} as const;

export type V7ColorToken = keyof typeof V7_COLORS;

/**
 * The eight seat hues in `view.players` index order, the same order as the V2 palette
 * (blue, red, green, yellow, violet, orange, teal, pink). Re-tuned for the dark ground:
 * each is at least 4.5:1 on every ground and pairwise CIEDE2000 >= 20 apart
 * (`ui/contrast.ts`). Provisional until the L72/L74 playtests (technical spec v7 §14.3).
 */
export const V7_SEAT_COLORS = [
  '#7cc4ff',
  '#ff6461',
  '#4fe06a',
  '#f5e05a',
  '#a080ff',
  '#f5b07a',
  '#33e6e0',
  '#f655c1',
] as const satisfies readonly [string, string, string, string, string, string, string, string];

/**
 * Admin tool-mode outline (technical spec v7 §7.8, L80-01): `--ink` inside `[data-mode="tool"]`.
 * A 1 px edge must reach 3:1 (WCAG 1.4.11) on every ground it sits on: 4.72 on `--bg-0`, 4.31 on
 * `--bg-1`, 3.89 on `--panel`, 3.46 on `--panel-2` (`ui/tool-mode.test.ts`). Outline only, never text.
 */
export const V7_TOOL_LINE = '#7d72c4';

export function v7Color(token: V7ColorToken): string {
  return V7_COLORS[token];
}

/** Seat hue for an index into `view.players`; out-of-range indexes clamp like the V2 palette. */
export function v7SeatColor(index: number): string {
  return V7_SEAT_COLORS[clampSeatIndex(index)];
}
