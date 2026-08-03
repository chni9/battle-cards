/**
 * Heuristic scoring weights — technical spec v3 §4.4 (L16-04).
 *
 * Tunable defaults — inventions, not validated measurements. Change only via
 * a decisions.md entry (#V3-5: constants module, no CLI sweep in V3).
 */

/** Band base scores — ordered by intent; higher wins. */
export const HEURISTIC_BAND_WEIGHTS = {
  lethalNow: 10_000,
  survive: 8_000,
  deny: 4_000,
  pressure: 2_000,
  invest: 1_000,
  sustain: 100,
} as const;

/** `buySpecialCard` only when points ≥ this (2 × SPECIAL_CARD_PURCHASE_COST). */
export const BUY_SPECIAL_POINTS_FLOOR = 40;

/** Tax only while lives > incomingThreat + this buffer. */
export const TAX_LIFE_BUFFER = 3;

/** Absorber Deny band: last applied resolution livesLost on target ≥ this. */
export const DENY_ABSORBER_MIN_LIVES_LOST = 3;
