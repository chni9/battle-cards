/**
 * What the life primitives report back — technical spec §4.2.
 *
 * §4.2 writes the primitives as returning nothing. They return an outcome instead so
 * that a caller can report and record what happened without the primitive having to
 * know about those consumers: the turn ledger (technical spec §4.4), the
 * `actionResolved` event (§5.3) and Absorber (rules spec §3) all need the numbers, and
 * a state diff taken afterwards cannot tell a shielded hit from an unshielded one.
 * Mutation still happens inside the primitive; the outcome is purely descriptive.
 */

import type { AttackCardId, CardId, LifeLossReason, PersistentEffect } from '@card-battle/shared';

/** One persistent effect's internal counter losing points (rules spec §5). */
export interface CounterDecrement {
  effectId: string;
  cardId: CardId;
  /** Counter points lost — one per life the card's user lost to damage. */
  amount: number;
}

export interface DamageOutcome {
  /** The attack card the damage came from. Only an attack card can deal damage. */
  source: AttackCardId;
  /** Damage stopped by the shield before reaching lives. */
  shieldAbsorbed: number;
  /** Lives actually lost — never more than the player had. */
  livesLost: number;
  /** Counters that lost points. Empty when the shield absorbed everything. */
  countersDecremented: readonly CounterDecrement[];
  /**
   * Effects whose counter reached 0: deactivated and permanently lost (rules spec §5). They
   * are no longer on the player, so nothing can decrement them again. Callers must send
   * each to the shared pool (L5-02).
   */
  deactivatedEffects: readonly PersistentEffect[];
  /** Ids of `deactivatedEffects` — kept for callers that only need identity. */
  deactivatedEffectIds: readonly string[];
}

export interface LifeLossOutcome {
  reason: LifeLossReason;
  /** Lives actually lost — never more than the player had. */
  livesLost: number;
}

export interface LifeGainOutcome {
  /** Lives actually granted, after the life cap. */
  livesGained: number;
  /** Lives lost to the cap (rules spec §7). */
  livesWasted: number;
}
