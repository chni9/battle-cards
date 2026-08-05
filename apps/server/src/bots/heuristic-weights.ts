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

/**
 * Tax only while lives > incomingThreat + this buffer.
 * Raised 3 → 5 (2026-08-04 playtest): buffer 3 Taxed down to ~4 lives with no pending hits.
 */
export const TAX_LIFE_BUFFER = 5;

/** Absorber Deny band: livesLost on target's last complete turn (public log) ≥ this. */
export const DENY_ABSORBER_MIN_LIVES_LOST = 3;

/**
 * Pressure soft cost penalty: score uses `damage - cost / PRESSURE_COST_DIVISOR`.
 * Pure `damage/cost` ranked Basic (1/1) above Super (7/10). Divisor 2 keeps cost
 * relevant without making expensive attacks worse than chip damage.
 */
export const PRESSURE_COST_DIVISOR = 2;

/**
 * Non-lethal Pressure only when the attack is upgraded and damage ≥ this.
 * Base chips / unupgraded Super score below Invest — bots build points & upgrades first
 * (playtest 2026-08-04: early Basic spam instead of economy → upgraded kill).
 * Upgraded Strong = 4, upgraded Super = 10; base Super = 7 is deferred until upgraded.
 */
export const STRIKE_MIN_DAMAGE = 4;

/** Tax play as Invest bonus when life-safe — primary point engine for upgrade buys. */
export const TAX_INVEST_BONUS = 40;

/** buyUpgradePoint Invest bonus — spend points into upgrade currency. */
export const BUY_UPGRADE_POINT_BONUS = 45;

/** Extra Invest for upgrading an attack card (on top of upgraded damage secondary). */
export const UPGRADE_ATTACK_BONUS = 60;

/** Spy on an unspied living seat — Deny-band offset (intel unlocks lethal-now). */
export const SPY_UNSPIED_BONUS = 80;

/** Prefer Spying the current top threat seat. */
export const SPY_TOP_THREAT_BONUS = 15;

/**
 * Sell-to-fund Invest offset — ONMMBZ log: bots at 0 pts drew forever while holding Spy/Mirror
 * instead of selling Mirror (6 pts) to play Spy.
 */
export const SELL_TO_FUND_BONUS = 70;

/** Soft Regen when lives ≤ this even with no pending attack (Imposition drip / Tax floor). */
export const REGEN_SOFT_LIFE = 6;

/**
 * Deny offset for attacking a seat with an active counter persistent (Imposition /
 * Points Generator). CBCPXV: human Imposition ran unchecked while bots sold attacks.
 * Even base Basic must outrank Invest / Spy-on-someone-else once a counter is live.
 */
export const BURN_COUNTER_BONUS = 150;

/**
 * Extra Survive score for mutual cancel (equal or stronger riposte — Lot 19) or Spy/Thief
 * counter. Sits above Mirror's +30 so a matching Basic cancel beats Mirror on a Basic hit.
 */
export const MUTUAL_CANCEL_BONUS = 40;

/**
 * Cards that previously fell through to `sustain` (= draw = 100) and were rng-tied with
 * draw — including Sentence (random self-elim). Explicit Invest / Deny offsets below.
 * Tunable defaults (2026-08-04 scoring hole fix).
 */
export const IMPOSITION_INVEST_BONUS = 55;
export const POINTS_GENERATOR_INVEST_BONUS = 50;
/** Spy Thief: mass steal + Spy all — Deny offset before per-opponent add-ons. */
export const SPY_THIEF_DENY_BONUS = 100;
/** Fallthrough for any playCard still without a branch — must stay strictly below draw. */
export const UNSCORED_PLAY_PENALTY = 50;

/**
 * Stance-pass upgrade / Absorber / finish tunables — playtest BNBBSH/CTHNVP/ESCEKV
 * (docs/superpowers/specs/2026-08-05-heuristic-stance-design.md). Inventions (#V3-5).
 */
export const UPGRADE_TAX_BONUS = 80;
export const UPGRADE_REGEN_BONUS = 75;
export const UPGRADE_MIRROR_BONUS = 55;
export const UPGRADE_SHIELD_BONUS = 50;
export const UPGRADE_ABSORBER_BONUS = 45;
export const UPGRADE_SENTENCE_BONUS = 65;
/** Contest extra on Mirror/Shield/attack upgrades. */
export const CONTEST_UPGRADE_EXTRA = 25;
/** Absorber+ when last complete turn spent ≥1 upgrade point — below lethal-now. */
export const ABSORBER_UP_DENY_BONUS = 120;
/** Absorber+ when pointsSpent > absorberCost + kit draw. */
export const ABSORBER_POINTS_DENY_BONUS = 70;
/** Finish stance: chip attack that reaches Spy-known lives. */
export const FINISH_CHIP_BONUS = 80;
/** Min last-turn livesLost for Absorber life top-up when Regen is held. */
export const ABSORBER_MIN_LIVES_VS_REGEN = 2;
