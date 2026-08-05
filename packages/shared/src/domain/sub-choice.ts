/**
 * Discriminated on `kind`. Generic `GameState.subChoice` kinds: pool-pick,
 * special-pick (Lot 24), and reanimation-kit (Lot 26).
 */

import type { SpecialCardId } from './card';
import type { KitId } from './kit';

export type SubChoiceKind =
  | 'mirror'
  | 'elimination-reward'
  | 'pool-pick'
  | 'steal-pick'
  | 'special-pick'
  | 'reanimation-kit';

export interface MirrorSubChoicePayload {
  playerId: string;
  isUpgraded: boolean;
  eligibleEffectIds: readonly string[];
}

export interface EliminationRewardSubChoicePayload {
  eliminationId: string;
  eliminatorPlayerId: string;
  eliminatedPlayerId: string;
}

/** Card Thief steal-when-spied — Mirror-shaped slot (L21-03). */
export interface StealPickSubChoicePayload {
  /** The thief choosing which card to steal. */
  playerId: string;
  victimPlayerId: string;
  eligibleInstanceIds: readonly string[];
  /** Remaining spied victims for an upgraded multi-target play (after the current one). */
  pendingSpiedVictimIds: readonly string[];
  /** Whether the Card Thief copy being resolved is upgraded. */
  cardIsUpgraded: boolean;
}

/** Card Absorber upgraded — choose cards from the shared pool (L24-01). */
export interface PoolPickSubChoicePayload {
  playerId: string;
  /** Exactly this many distinct eligible ids must be chosen (#V4-15). */
  maxCount: number;
  eligibleInstanceIds: readonly string[];
  cardIsUpgraded: boolean;
}

/** Card Transformer upgraded — choose the special obtained (L24-02). */
export interface SpecialPickSubChoicePayload {
  playerId: string;
  /** Always the full `SPECIAL_CARD_IDS` set; duplicates with hand allowed. */
  eligibleCardIds: readonly SpecialCardId[];
}

/** Upgraded Reanimation — choose the kit after rewards (#V4-13 / L26-02). */
export interface ReanimationKitSubChoicePayload {
  playerId: string;
  eligibleKitIds: readonly KitId[];
}

/**
 * Discriminated on `kind`.
 */
export type SubChoiceState =
  | ({ kind: 'mirror'; deadlineMs: number } & MirrorSubChoicePayload)
  | ({ kind: 'elimination-reward'; deadlineMs: number } & EliminationRewardSubChoicePayload)
  | ({ kind: 'steal-pick'; deadlineMs: number } & StealPickSubChoicePayload)
  | ({ kind: 'pool-pick'; deadlineMs: number } & PoolPickSubChoicePayload)
  | ({ kind: 'special-pick'; deadlineMs: number } & SpecialPickSubChoicePayload)
  | ({ kind: 'reanimation-kit'; deadlineMs: number } & ReanimationKitSubChoicePayload);
