/**
 * Generic sub-choice model — technical spec v4 §4.4, backlog L20-18.
 *
 * A sub-choice pauses ordinary turn actions until it resolves (picked, or defaulted
 * on timeout). Today there are two: Mirror (a slot — one player, one instant) and
 * elimination rewards (a queue — one job per elimination, the head active). Both are
 * fully typed and constructible here. Four more kinds are declared for cards that
 * need them later (Card Absorber's pool pick, Card Thief's steal-when-spied pick,
 * Card Transformer's special pick, Reanimation's kit pick — Lots 21/24/26) so their
 * handlers, the engine gate and the wire protocol never repeat this duplication —
 * but they are deliberately impossible to construct before those tasks land
 * (`payload: never`), so a stray literal cannot silently claim a kind before its
 * handler exists.
 *
 * `GameState` does not (yet) store every kind under one shared field name — see
 * `docs/agent/decisions.md` 2026-08-04 (L20-18): `mirrorChoice` / `rewardChoice` /
 * `rewardQueue` stay the concrete slot/queue storage so no existing test needs
 * editing. This union is instead the single source of truth for their *shape*, for
 * the one engine gate (`hasActiveSubChoice`), and for the `subChoiceRequired` /
 * `resolveSubChoice` wire pair.
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

/**
 * Discriminated on `kind`. Only `'mirror'` and `'elimination-reward'` are fully
 * typed and constructible in Lot 20 — see the module doc comment.
 */
export type SubChoiceState =
  | ({ kind: 'mirror'; deadlineMs: number } & MirrorSubChoicePayload)
  | ({ kind: 'elimination-reward'; deadlineMs: number } & EliminationRewardSubChoicePayload)
  | { kind: 'pool-pick'; deadlineMs: number; payload: never }
  | { kind: 'steal-pick'; deadlineMs: number; payload: never }
  | { kind: 'special-pick'; deadlineMs: number; payload: never }
  | { kind: 'reanimation-kit'; deadlineMs: number; payload: never };
