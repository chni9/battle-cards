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

/** Solid 3px halo + soft glow — replaces seat inset shadow (do not concatenate). */
export const CHOICE_SELECTED_HALO = `0 0 0 3px ${CHOICE_SELECTED_ORANGE}, 0 0 0 7px rgba(240, 119, 31, 0.5)`;

/**
 * Shop selected chrome for SeatTile. Keeps seat wash fill; drops the inset
 * accent so the orange halo is the only outline and stays fully visible.
 */
export function choiceTileSelectedStyle(
  base: CSSProperties | undefined,
): CSSProperties {
  return {
    backgroundColor: base?.backgroundColor,
    borderColor: CHOICE_SELECTED_ORANGE,
    boxShadow: CHOICE_SELECTED_HALO,
  };
}
