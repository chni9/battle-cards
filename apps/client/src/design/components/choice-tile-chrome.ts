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
export const CHOICE_SELECTED_ORANGE = '#ff7a18';

/**
 * Layout ring for selected SeatTiles. Padding *is* the halo — Dialog
 * `overflow-hidden` / `overflow-y-auto` crop outline and outer box-shadow,
 * but they cannot crop a box-model frame.
 * `p-1.5` (6px) matches `--radius-card` so the outer round stays concentric.
 */
export const CHOICE_SELECTED_FRAME_CLASS =
  'rounded-[calc(var(--radius-card)+0.375rem)] p-1.5';
export const CHOICE_IDLE_FRAME_CLASS = 'p-1.5';
export const CHOICE_SELECTED_INSET =
  `inset 0 0 0 2px ${CHOICE_SELECTED_ORANGE}, inset 0 0 16px rgba(255, 122, 24, 0.4)`;

export function choiceTileSelectedFrameStyle(): CSSProperties {
  return { backgroundColor: CHOICE_SELECTED_ORANGE };
}

/**
 * SeatTile selected chrome on the inner button. Keeps the seat wash fill;
 * inner glow only (no outer shadow).
 */
export function choiceTileSelectedStyle(
  base: CSSProperties | undefined,
): CSSProperties {
  return {
    backgroundColor: base?.backgroundColor,
    borderColor: CHOICE_SELECTED_ORANGE,
    boxShadow: CHOICE_SELECTED_INSET,
  };
}
