/**
 * Generic sub-choice model — technical spec v4 §4.4, backlog L20-18 / L21-03 / L24.
 *
 * A sub-choice pauses ordinary turn actions until it resolves (picked, or defaulted
 * on timeout). Mirror, elimination rewards, steal-pick, pool-pick and special-pick
 * are fully typed. `reanimation-kit` stays `payload: never` until Lot 26.
 *
 * `GameState` stores Mirror / reward / steal under dedicated fields; Lot 24's
 * `pool-pick` / `special-pick` share `GameState.subChoice` — see
 * `docs/agent/decisions.md` 2026-08-05 (Lot 24).
 */

import type { SpecialCardId } from './card';

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

/**
 * Discriminated on `kind`. `'reanimation-kit'` stays unconstructible until Lot 26.
 */
export type SubChoiceState =
  | ({ kind: 'mirror'; deadlineMs: number } & MirrorSubChoicePayload)
  | ({ kind: 'elimination-reward'; deadlineMs: number } & EliminationRewardSubChoicePayload)
  | ({ kind: 'steal-pick'; deadlineMs: number } & StealPickSubChoicePayload)
  | ({ kind: 'pool-pick'; deadlineMs: number } & PoolPickSubChoicePayload)
  | ({ kind: 'special-pick'; deadlineMs: number } & SpecialPickSubChoicePayload)
  | { kind: 'reanimation-kit'; deadlineMs: number; payload: never };
