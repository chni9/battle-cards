/**
 * Arcade chrome classes shared by the V7 primitives (technical spec v7 §5.3, §5.7). They live
 * outside `button.tsx` so that file exports components only (react-refresh), and every class
 * map is a literal string so Tailwind sees each utility.
 *
 * Shape comes only from `--chrome-outline-width`, `--chrome-shadow`, `--chrome-radius(-sm)` and
 * `--chrome-press-y`, never from literals, so L80 can override them under `[data-mode="tool"]`.
 */

import type { ButtonVariant } from './button';

/** The 3 px ink outline every chrome shape starts from. */
export const CHROME_OUTLINE_CLASS = 'border-(length:--chrome-outline-width) border-v7-ink';
export const CHROME_SHAPE_CLASS = `${CHROME_OUTLINE_CLASS} rounded-v7-chrome shadow-v7-chrome`;
export const CHROME_SHAPE_SM_CLASS = `${CHROME_OUTLINE_CLASS} rounded-v7-chrome-sm shadow-v7-chrome`;
/** Outlined and flat, with no drop shadow: badges and text inputs sit on a surface, not above it. */
export const CHROME_FLAT_SM_CLASS = `${CHROME_OUTLINE_CLASS} rounded-v7-chrome-sm`;
/** The round chrome frame of an avatar. */
export const CHROME_DISC_CLASS = `${CHROME_OUTLINE_CLASS} rounded-full shadow-v7-chrome`;
export const CHROME_FOCUS_CLASS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v7-text';

/**
 * Disabled chrome reads "off" rather than faded: `--panel-2` fill, `--text-2` label, a dashed
 * outline, no drop shadow and dimmed icons. A faded `--cta` turned muddy olive on `--panel`.
 * The same look applies to `aria-disabled="true"`, which keeps a control focusable (Carousel
 * end-stops, Button `focusableWhenDisabled`).
 */
export const CHROME_DISABLED_CLASS =
  'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-v7-panel-2 disabled:text-v7-text-2 disabled:shadow-none disabled:[&_svg]:opacity-50 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:bg-v7-panel-2 aria-disabled:text-v7-text-2 aria-disabled:shadow-none aria-disabled:[&_svg]:opacity-50';

/** The outlined track that holds Tabs and Segmented items. */
export const CHROME_TRACK_CLASS = `${CHROME_OUTLINE_CLASS} inline-flex max-w-full gap-1 rounded-v7-chrome bg-v7-panel p-1`;
export const CHROME_TRACK_ITEM_CLASS = `min-h-11 rounded-v7-chrome-sm font-v7-display text-v7-body leading-none disabled:cursor-not-allowed ${CHROME_FOCUS_CLASS}`;
export const CHROME_TRACK_SELECTED_CLASS = 'bg-v7-cta text-v7-text-on-cta';
/** The selected item of a locked track keeps its place in `--text-2`, not a faded `--cta`. */
export const CHROME_TRACK_SELECTED_LOCKED_CLASS = 'bg-v7-text-2 text-v7-text-on-cta';
export const CHROME_TRACK_IDLE_CLASS = 'text-v7-text-2 enabled:hover:text-v7-text disabled:opacity-50';

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
