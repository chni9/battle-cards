/**
 * Seat-index identity colors — Table UX polish L39-03.
 * Index is `view.players` array position (not turnOrder). Client-only; no wire field.
 * Palette: 0 blue · 1 red · 2 green · 3 yellow.
 */

import type { CSSProperties } from 'react';

/** Max seats in Classic (2–4); palette length is fixed at 4. */
export const SEAT_PALETTE_SIZE = 4;

export type SeatIndex = 0 | 1 | 2 | 3;

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

/** CSS custom-property reference for a seat hue. */
export function seatColorVar(index: number): string {
  return `var(--color-seat-${String(clampSeatIndex(index))})`;
}

export interface SeatZoneStyleOptions {
  /** Current-turn seat — strong glow ring. */
  active?: boolean;
  /**
   * `soft` — opponent seats (readable tint).
   * `fill` — POV dock / my-zone (dominant seat wash; replaces surface-kit pink).
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
  const color = seatColorVar(index);
  const intensity = options?.intensity ?? 'soft';
  const fillAmount = intensity === 'fill' ? 28 : 22;
  const topAccent = `inset 0 3px 0 0 ${color}`;
  const active =
    options?.active === true
      ? [
          `0 0 0 3px color-mix(in srgb, ${color} 90%, white)`,
          `0 0 0 6px color-mix(in srgb, ${color} 45%, transparent)`,
          `0 0 28px color-mix(in srgb, ${color} 65%, transparent)`,
        ].join(', ')
      : null;
  return {
    borderColor: color,
    backgroundColor: `color-mix(in srgb, ${color} ${String(fillAmount)}%, var(--color-surface-raised))`,
    boxShadow: active !== null ? `${topAccent}, ${active}` : topAccent,
  };
}

/** Inline `color` for nicknames rendered in seat hue. */
export function seatNameStyle(index: number): CSSProperties {
  return { color: seatColorVar(index) };
}
