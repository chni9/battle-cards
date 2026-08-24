/**
 * Shared selected/idle classes for shop-style choice tiles (L44-01).
 * Copied from the shop buy cell — do not restyle here.
 */

import type { CSSProperties } from 'react';

export interface ChoiceTileChromeOptions {
  selected: boolean;
  /** Not your turn / pool at cap — cursor + fade. */
  disabled?: boolean;
  /** Unaffordable but still selectable (shop). */
  faded?: boolean;
}

export function choiceTileClassName(options: ChoiceTileChromeOptions): string {
  const faded = options.faded === true || options.disabled === true;
  return [
    'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
    options.selected
      ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
      : 'border-border-soft bg-surface hover:border-border',
    faded ? 'opacity-55' : '',
    options.disabled === true ? 'cursor-not-allowed' : '',
  ].join(' ');
}

/**
 * `--color-cta-orange` as a concrete hex. Seat wash sets inline `borderColor` /
 * `boxShadow`, which otherwise override the Tailwind selected ring.
 */
export const CHOICE_SELECTED_ORANGE = '#f0771f';

/** Offset halo — SeatTile wraps with padding so Dialog overflow cannot clip it. */
export const CHOICE_SELECTED_OUTLINE = `3px solid ${CHOICE_SELECTED_ORANGE}`;
export const CHOICE_SELECTED_OUTLINE_OFFSET = '3px';
export const CHOICE_SELECTED_INSET = `inset 0 0 0 2px ${CHOICE_SELECTED_ORANGE}, inset 0 0 18px rgba(240, 119, 31, 0.45)`;

/**
 * SeatTile selected chrome. Offset outline + inner glow; no outer box-shadow
 * (those get clipped by Dialog `overflow-hidden` / `overflow-y-auto`).
 */
export function choiceTileSelectedStyle(
  base: CSSProperties | undefined,
): CSSProperties {
  return {
    backgroundColor: base?.backgroundColor,
    borderColor: CHOICE_SELECTED_ORANGE,
    outline: CHOICE_SELECTED_OUTLINE,
    outlineOffset: CHOICE_SELECTED_OUTLINE_OFFSET,
    boxShadow: CHOICE_SELECTED_INSET,
  };
}
