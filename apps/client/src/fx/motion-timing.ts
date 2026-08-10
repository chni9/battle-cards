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

/** Token ↔ action-log chip travel length (seconds) — slower than default motion. */
export const TOKEN_FLYOUT_DURATION_S = 0.85;

/** Stagger between multi-chip token ↔ action-log flyouts (ms). */
export const TOKEN_STAGGER_MS = 95;

/** Ease used across Table FX and card motion. */
export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

/** Overlay event TTL — keep past the slowest FX so AnimatePresence can exit cleanly. */
export const FX_TTL_MS = 750;

/** Threat outline + targeting cue TTL — long enough to read Incoming. */
export const THREAT_FX_TTL_MS = 3800;

/** Visible pulse length for the full-screen threat outline (seconds). */
export const THREAT_OUTLINE_DURATION_S = 3.2;
