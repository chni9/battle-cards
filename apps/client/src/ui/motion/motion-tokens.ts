/**
 * V7 motion tokens (technical spec v7 §5.7). Mirrored by `--dur-*` and `--ease-entrance`
 * in `ui/tokens.css`; `ui/palette.test.ts` proves the two stay equal.
 * Presentational only: never gate an intent on these durations.
 */

export const DUR_FAST_MS = 120;
export const DUR_BASE_MS = 220;
export const DUR_SLOW_MS = 400;

export const V7_DURATIONS_MS = {
  fast: DUR_FAST_MS,
  base: DUR_BASE_MS,
  slow: DUR_SLOW_MS,
} as const;

export type V7Duration = keyof typeof V7_DURATIONS_MS;

/** Card spring (§5.7: stiffness ≈ 400, damping ≈ 28). */
export const CARD_SPRING = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
} as const;

/** Ease-out for entrances (§5.7). Same curve as V2 `MOTION_EASE` in `fx/motion-timing.ts`. */
export const EASE_ENTRANCE = [0.16, 1, 0.3, 1] as const;

/** `motion` takes seconds, the CSS tokens take milliseconds. */
export function durationS(duration: V7Duration): number {
  return V7_DURATIONS_MS[duration] / 1000;
}
