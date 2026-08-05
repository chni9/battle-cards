/**
 * Generic sub-choice model — technical spec v4 §4.4, backlog L20-18 / L21-03.
 *
 * A sub-choice pauses ordinary turn actions until it resolves (picked, or defaulted
 * on timeout). Mirror and elimination rewards are fully typed. Card Thief's
 * steal-when-spied pick (`steal-pick`) is constructible from L21-03. Three more
 * kinds stay `payload: never` until Lots 24/26.
 *
 * `GameState` stores Mirror / reward / steal under dedicated fields — see
 * `docs/agent/decisions.md` 2026-08-04 (L20-18) and 2026-08-05 (L21-03).
 */

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

/**
 * Discriminated on `kind`. `'mirror'`, `'elimination-reward'` and `'steal-pick'`
 * are fully typed and constructible.
 */
export type SubChoiceState =
  | ({ kind: 'mirror'; deadlineMs: number } & MirrorSubChoicePayload)
  | ({ kind: 'elimination-reward'; deadlineMs: number } & EliminationRewardSubChoicePayload)
  | ({ kind: 'steal-pick'; deadlineMs: number } & StealPickSubChoicePayload)
  | { kind: 'pool-pick'; deadlineMs: number; payload: never }
  | { kind: 'special-pick'; deadlineMs: number; payload: never }
  | { kind: 'reanimation-kit'; deadlineMs: number; payload: never };
