/**
 * Shared Table / Dialog motion timing — restrained but readable.
 * Presentational only; never gate intents on these durations.
 */

/** Default enter / flyout / pulse length (seconds). */
export const MOTION_DURATION_S = 0.55;

/** Slightly shorter for micro pulses (resource ticks). */
export const MOTION_PULSE_S = 0.45;

/** How long resource gain/loss color + float label stay visible. */
export const RESOURCE_FLASH_MS = 1600;

/** Stagger between list rows (Assassin multi). */
export const MOTION_STAGGER_S = 0.08;

/** Ease used across Table FX and card motion. */
export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

/** Overlay event TTL — keep past the slowest FX so AnimatePresence can exit cleanly. */
export const FX_TTL_MS = 750;
