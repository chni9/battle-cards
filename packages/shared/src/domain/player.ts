/**
 * Player state, turn ledger and connection state — technical spec §4.1, §4.4, §5.7.
 */

import type { CardInstance } from './card';
import type { PendingEffect, PersistentEffect } from './effect';
import type { KitId } from './kit';

/**
 * Technical spec §5.7. `disconnected` is the 60-second grace window; once it expires
 * the player becomes `absent` and draws immediately on each of their turns. An absent
 * or inactive player stays a valid target throughout — no immunity.
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'absent';

export interface ConnectionState {
  status: ConnectionStatus;
  /**
   * Epoch milliseconds when the 60-second reconnection window started, or `null` while
   * connected. Real time, independent of whose turn it is.
   */
  disconnectedAt: number | null;
  /** Turns auto-played because the player is absent. Elimination at 3 (technical spec §5.7). */
  automaticTurnsTaken: number;
  /**
   * Consecutive turns where the 30-second timer expired while connected. Elimination
   * at 5 — a deliberately higher threshold, and a mechanism independent of the
   * disconnection counter above (technical spec §5.7).
   */
  consecutiveTimeouts: number;
}

/**
 * What a player lost and spent during their most recent complete turn — action plus
 * resolution phase (technical spec §4.4, ruling §6.2 #12).
 *
 * Absorber reads this, and its upgraded version captures only what the target
 * *actively spent*. A state diff cannot tell spending apart from theft by a third
 * party, so the two are recorded separately and never summed.
 */
export interface TurnLedger {
  /** Lives lost from any cause: damage, Tax, Imposition, Suicide. */
  livesLost: number;
  /** Points the player chose to spend. Excludes anything taken by an opponent. */
  pointsSpent: number;
  /** Upgrade points the player chose to spend. Excludes anything taken by an opponent. */
  upgradePointsSpent: number;
  /** Points taken by a third party (Thief, Spy Thief). Excluded from Absorber's capture. */
  pointsLostToTheft: number;
  /** Upgrade points taken by a third party. Excluded from Absorber's capture. */
  upgradePointsLostToTheft: number;
}

export interface Player {
  /** Stable per-game identifier. */
  id: string;
  nickname: string;
  kitId: KitId;
  lives: number;
  points: number;
  upgradePoints: number;
  /**
   * Shield points. Absorbs damage only, before lives, and only one shield may be
   * active at a time (rules spec §1, §3). 0 means no active shield.
   */
  shield: number;
  /**
   * True while an upgraded Shield is active. Upgraded Shield blocks Thief and Spy at
   * resolution with no shield-point cost (rules spec §3, Lot 3 ruling). Cleared when
   * `shield` reaches 0.
   */
  shieldIsUpgraded: boolean;
  /** Attack and action cards held. */
  hand: CardInstance[];
  /** Special cards held. Single use each (rules spec §5). */
  specialCards: CardInstance[];
  /** Delayed resolution queue targeting this player, resolved in ascending `queuedAt`. */
  pendingEffects: PendingEffect[];
  /** Persistent effects this player activated, whoever they act on. */
  activePersistentEffects: PersistentEffect[];
  turnLedger: TurnLedger;
  connectionState: ConnectionState;
  /**
   * Set when the player is eliminated (rules spec §6): they lose all lives and become
   * a spectator. Distinct from `lives === 0`, since a player can reach 0 lives before
   * elimination is processed, and upgraded Suicide spares its own user.
   */
  isEliminated: boolean;
  /**
   * Consecutive turns remaining for Block (technical spec v4 §4.5). 0 when inactive.
   * Decremented in `advanceTurn`, not in `PersistentEffect.counter` — that field is
   * eaten by `applyDamage` one point per life lost.
   */
  blockTurnsRemaining: number;
  /**
   * Attack cards forbidden while a Block chain holds the seat (L25-01).
   * Distinct from `blockTurnsRemaining`: that counter is already 0 on the last
   * consecutive turn while this seat is still current.
   */
  blockAttacksForbidden: boolean;
  /**
   * Attack Thief block charges (technical spec v4 §5.1, L23-03). 0 when inactive.
   * Must not live in `PersistentEffect.counter` — `applyDamage` decrements that per
   * life lost. Public presence only; exact count is private on `PrivateSelfView`.
   */
  attackBlockCharges: number;
  /**
   * Frozen kit / cards / tokens at the moment of elimination (Lot 19). Present once
   * eliminated; used for the public `eliminationReveal` view. Not Spy relations.
   */
  eliminationSnapshot: EliminationSnapshot | null;
}

/**
 * Death-time freeze of private state — Lot 19 designer feedback.
 * Captured before reward hold / pool dump so cards stay visible after leftovers leave.
 */
export interface EliminationSnapshot {
  kitId: KitId;
  hand: CardInstance[];
  specialCards: CardInstance[];
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
  shieldIsUpgraded: boolean;
  turnSequence: number;
}
