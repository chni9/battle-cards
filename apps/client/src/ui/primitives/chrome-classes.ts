/**
 * Arcade chrome classes shared by the V7 primitives (technical spec v7 §5.3, §5.7). They live
 * outside `button.tsx` so that file exports components only (react-refresh), and every class
 * map is a literal string so Tailwind sees each utility.
 *
 * Shape comes only from `--chrome-outline-width`, `--chrome-shadow`, `--chrome-radius(-sm)` and
 * `--chrome-press-y`, never from literals, so L80 can override them under `[data-mode="tool"]`.
 */

import type { ButtonVariant } from './button';

export const CHROME_SHAPE_CLASS =
  'border-(length:--chrome-outline-width) border-v7-ink rounded-v7-chrome shadow-v7-chrome';
export const CHROME_SHAPE_SM_CLASS =
  'border-(length:--chrome-outline-width) border-v7-ink rounded-v7-chrome-sm shadow-v7-chrome';
export const CHROME_FOCUS_CLASS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v7-text';
export const CHROME_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

/** Fill and label per variant. Labels on the three CTA fills use `--text-on-cta` (§5.1). */
export const BUTTON_VARIANT_CLASS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-v7-cta text-v7-text-on-cta',
  secondary: 'bg-v7-cta-2 text-v7-text-on-cta',
  danger: 'bg-v7-danger text-v7-text-on-cta',
  quiet: 'bg-v7-panel-2 text-v7-text',
};

/**
 * Pressed chrome drops `--chrome-press-y` (3 px) and loses its shadow (§5.3). Under reduced
 * motion the press is a brightness change only, with no translate (§5.7).
 */
export function chromePressClass(reduced: boolean): string {
  return reduced
    ? 'enabled:active:brightness-90'
    : 'transition-[translate,box-shadow] duration-(--dur-fast) enabled:active:translate-y-(--chrome-press-y) enabled:active:shadow-none';
}

export function motionAttribute(reduced: boolean): 'reduced' | 'full' {
  return reduced ? 'reduced' : 'full';
}

/**
 * An icon never sits directly on a fill within CIEDE2000 20 of one of its body or motif tokens
 * (DESIGN.md › Icons › Accessibility and use): `point` or `shop` on `--cta`, `help` on
 * `--cta-2`, `life` or `flag` on `--danger` would keep only their ink outline. On these three
 * fills every icon therefore sits in a `--bg-0` well, whatever its name, so a later icon
 * cannot collide either; on `quiet` (`--panel-2`) it sits directly on the fill.
 */
export function iconNeedsWell(variant: ButtonVariant): boolean {
  return variant !== 'quiet';
}

export const ICON_WELL_CLASS = 'inline-flex shrink-0 items-center justify-center rounded-full bg-v7-bg-0';
