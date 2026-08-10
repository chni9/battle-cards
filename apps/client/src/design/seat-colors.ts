/**
 * Seat-index identity colors — Table UX polish L39-03.
 * Index is `view.players` array position (not turnOrder). Client-only; no wire field.
 * Palette: 0 blue · 1 red · 2 green · 3 yellow.
 *
 * Hex values are used in inline styles (not `var(--color-seat-*)` / `color-mix`) so
 * mobile Safari always paints them — theme CSS vars alone were falling through to gray.
 */

import type { CSSProperties } from 'react';

/** Max seats in Classic (2–4); palette length is fixed at 4. */
export const SEAT_PALETTE_SIZE = 4;

export type SeatIndex = 0 | 1 | 2 | 3;

/** Concrete hex palette — single source for inline styles. */
export const SEAT_COLORS = [
  '#1d6fd8',
  '#d62828',
  '#1a9b3c',
  '#ffd400',
] as const satisfies readonly [string, string, string, string];

export interface SeatPlayersView {
  players: readonly { id: string }[];
}

/** Index in `view.players`, or `null` if the id is absent / out of palette range. */
export function seatIndexOf(view: SeatPlayersView, playerId: string): SeatIndex | null {
  const index = view.players.findIndex((player) => player.id === playerId);
  if (index < 0 || index >= SEAT_PALETTE_SIZE) {
    return null;
  }
  return index as SeatIndex;
}

/** Clamp any integer into the 0–3 palette (unknown seats fall back to 0). */
export function clampSeatIndex(index: number): SeatIndex {
  if (!Number.isFinite(index) || index < 0) {
    return 0;
  }
  if (index >= SEAT_PALETTE_SIZE) {
    return (SEAT_PALETTE_SIZE - 1) as SeatIndex;
  }
  return Math.floor(index) as SeatIndex;
}

/** Resolved hex for a seat — use in React inline styles (mobile-safe). */
export function seatColorHex(index: number): string {
  return SEAT_COLORS[clampSeatIndex(index)];
}

/** Alias of `seatColorHex` (name kept for older call sites). */
export function seatColorVar(index: number): string {
  return seatColorHex(index);
}

/** Mix a hex color over white at `amount` (0–1). Avoids `color-mix()` for mobile Safari. */
export function seatColorWash(hex: string, amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const rgb = parseHexRgb(hex);
  if (rgb === null) {
    return hex;
  }
  const r = Math.round(rgb.r * clamped + 255 * (1 - clamped));
  const g = Math.round(rgb.g * clamped + 255 * (1 - clamped));
  const b = Math.round(rgb.b * clamped + 255 * (1 - clamped));
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

/** Hex with alpha channel for glows / overlays. */
export function seatColorAlpha(hex: string, alpha: number): string {
  const rgb = parseHexRgb(hex);
  if (rgb === null) {
    return hex;
  }
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${String(rgb.r)}, ${String(rgb.g)}, ${String(rgb.b)}, ${String(a)})`;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, '');
  if (raw.length !== 6) {
    return null;
  }
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) {
    return null;
  }
  return { r, g, b };
}

export interface SeatZoneStyleOptions {
  /** Current-turn seat — strong glow ring. */
  active?: boolean;
  /**
   * `soft` — opponent seats (readable tint).
   * `fill` — POV dock / my-zone (stronger seat wash).
   */
  intensity?: 'soft' | 'fill';
}

/**
 * Seat-colored chrome for opponent seats and the POV dock.
 * Optional `active` adds a loud seat-colored glow for whose turn it is.
 */
export function seatZoneStyle(
  index: number,
  options?: SeatZoneStyleOptions,
): CSSProperties {
  const color = seatColorHex(index);
  const intensity = options?.intensity ?? 'soft';
  const fillAmount = intensity === 'fill' ? 0.28 : 0.22;
  const topAccent = `inset 0 3px 0 0 ${color}`;
  const active =
    options?.active === true
      ? [
          `0 0 0 3px ${seatColorWash(color, 0.9)}`,
          `0 0 0 6px ${seatColorAlpha(color, 0.45)}`,
          `0 0 28px ${seatColorAlpha(color, 0.65)}`,
        ].join(', ')
      : null;
  return {
    borderColor: color,
    backgroundColor: seatColorWash(color, fillAmount),
    boxShadow: active !== null ? `${topAccent}, ${active}` : topAccent,
  };
}

/** Inline `color` for nicknames rendered in seat hue. */
export function seatNameStyle(index: number): CSSProperties {
  return { color: seatColorHex(index) };
}
