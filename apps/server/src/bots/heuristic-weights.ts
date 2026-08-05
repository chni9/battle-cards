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
 * Tunable defaults (2026-08-04 scoring hole fix). Retuned 55 → 60 / 50 → 55 / 100 → 110
 * 2026-08-05 (L29-06, decisions.md) alongside the new Poison/Curse/Super Absorber bands,
 * so the four V1-era branches keep a clear margin once more specials compete for Invest/Deny.
 */
export const IMPOSITION_INVEST_BONUS = 60;
export const POINTS_GENERATOR_INVEST_BONUS = 55;
/** Spy Thief: mass steal + Spy all — Deny offset before per-opponent add-ons. */
export const SPY_THIEF_DENY_BONUS = 110;
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

/** Extra sustain per kit draw above 1 (L29-02). Untouchable stays at sustain=100. Tunable default, not measured. */
export const DRAW_SCORE_PER_EXTRA_DRAW = 20;

/**
 * Economy / theft specials (L29-05) — Super Regeneration, Upgrade Point Thief,
 * Card Thief. Tunable defaults (#V3-5), never measured.
 */
export const SUPER_REGEN_INVEST_BONUS = 55;
export const SUPER_REGEN_SURVIVE_BONUS = 35;
export const UPGRADE_POINT_THIEF_DENY_BONUS = 90;
export const CARD_THIEF_DENY_BONUS = 80;

/**
 * Persistent specials (L29-06) — Poison, Curse, Super Absorber. Tunable defaults
 * (#V3-5), never measured.
 */
export const POISON_INVEST_BONUS = 50;
/** Extra Invest when Poison hits 2+ living opponents at once. */
export const POISON_MULTI_TARGET_BONUS = 15;
export const CURSE_DENY_BONUS = 60;
export const CURSE_INVEST_BONUS = 40;
/** Curse prefers a victim whose last complete turn spent at least this many points. */
export const CURSE_HIGH_SPEND_THRESHOLD = 3;
/** Mirrors `ABSORBER_UP_DENY_BONUS` / `ABSORBER_POINTS_DENY_BONUS`, doubled for the Super. */
export const SUPER_ABSORBER_UP_DENY_BONUS = 140;
export const SUPER_ABSORBER_POINTS_DENY_BONUS = 80;
/** Passive baseline Deny — Super Absorber pays off every future turn even with no signal yet. */
export const SUPER_ABSORBER_BASELINE_DENY_BONUS = 40;

/**
 * Retuned 2026-08-05 (L29-06, decisions.md): Sentence's per-opponent add-on was tied
 * for last among the four already-branched specials; raised so it keeps a clearer
 * margin over Imposition / Points Generator on a 3+ player table.
 */
export const SENTENCE_UPGRADED_PER_OPPONENT = 8;

/**
 * Attack / redirection specials (L29-07) — MEGA ATTACK, Super Mirror, Attack Thief.
 * Tunable defaults (#V3-5), never measured.
 */
export const MEGA_ATTACK_PRESSURE_PER_OPPONENT = 15;
export const SUPER_MIRROR_SURVIVE_BONUS = 40;
export const SUPER_MIRROR_UPGRADED_BONUS = 20;
export const ATTACK_THIEF_SURVIVE_BONUS = 30;
export const ATTACK_THIEF_DENY_BONUS = 25;
/** Attack Thief Deny add-on when a spied opponent's hand shows a shared attack card. */
export const ATTACK_THIEF_INTEL_BONUS = 20;

/**
 * Turn-flow, pool and reversal specials (L29-08) — Block, Invisibility, Card Absorber,
 * Card Transformer, Reanimation, plus `deactivatePersistent` / `activateDuplication`.
 * Tunable defaults (#V3-5), never measured.
 */
export const BLOCK_SURVIVE_BONUS = 50;
/** Block played proactively for the consecutive-turn grant, no threat pending. */
export const BLOCK_INVEST_BONUS = 30;
export const INVISIBILITY_INVEST_BONUS = 70;
export const CARD_ABSORBER_INVEST_BONUS = 60;
/** Card Absorber Invest add-on per recoverable pool card. */
export const CARD_ABSORBER_PER_CARD_BONUS = 5;
/** Base Card Absorber recovers at most this many — matches `CARD_ABSORBER_BASE_MAX`. */
export const CARD_ABSORBER_BASE_BONUS_CARDS = 4;
/** Upgraded Card Absorber choose-cap — matches `CARD_ABSORBER_UPGRADED_MAX`. */
export const CARD_ABSORBER_UPGRADED_BONUS_CARDS = 8;
export const CARD_TRANSFORMER_INVEST_BONUS = 45;
export const REANIMATION_INVEST_BONUS = 40;
export const REANIMATION_LOW_LIFE_FLOOR = 4;
/** Reanimation Invest add-on when already at/below the soft-Regen floor — insurance is urgent. */
export const REANIMATION_LOW_LIFE_BONUS = 20;
/** `deactivatePersistent` (Invisibility) — Invest add-on when giving up immunity to act. */
export const DEACTIVATE_PERSISTENT_INVEST_BONUS = 40;
/** Points floor above which giving up Invisibility's income is worth it even without a stance push. */
export const DEACTIVATE_PERSISTENT_POINTS_FLOOR = 15;
/** `activateDuplication` (Duplicator) — Invest add-on for renewing the anticipatory window. */
export const ACTIVATE_DUPLICATION_INVEST_BONUS = 50;
