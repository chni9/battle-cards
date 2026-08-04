/**
 * The shape every card handler implements — technical spec §4.1, ruling §6.2 #5.
 *
 * One typed handler per card, composing the engine's primitives. No generic effect
 * engine, no DSL, no rule interpreter: that architecture was deliberated and locked
 * (see `docs/agent/decisions.md`, and `docs/agent/card-handler.md` for the workflow).
 */

import type { CardInstance, GameState } from '@card-battle/shared';

import type { Rng } from '../engine/rng';

/**
 * What a handler is given when its card is played.
 *
 * Deliberately minimal: it carries what the code that exists today needs, and grows one
 * documented field at a time as the subsystems arrive — the resolution queue (L1-07), the
 * turn ledger (L3-07), the visibility matrix (L3-05), sub-choices (L3-09). A field nothing
 * reads yet is a field nobody can get right.
 *
 * Two standing rules for that growth: the life primitives are imported directly by the
 * handler that needs them, while anything random is *injected* here — a handler reaching
 * for a generator of its own breaks reproducibility (AGENTS golden rule 5).
 */
export interface EffectContext {
  state: GameState;
  /** The player taking the action. Always the player whose turn it is. */
  sourcePlayerId: string;
  /** `null` for a card with no target: Shield, Regeneration, Tax. */
  targetPlayerId: string | null;
  /** The exact copy being played — it carries the card id and its own `isUpgraded`. */
  card: CardInstance;
  /**
   * Optional play quantity — Regeneration lives bought (L3-02). `null` when the client
   * omitted it; other cards ignore this field.
   */
  quantity: number | null;
  /** Injected seeded generator — Sentence, Mirror default, special purchase. */
  rng: Rng;
  /**
   * Injected wall-clock ms — Mirror / reward sub-choice deadlines (technical spec v3 §8.1).
   * Handlers must not call `Date.now()` themselves.
   */
  nowMs: number;
}

export interface CardHandler {
  /**
   * Whether this specific play is legal, on top of the generic revalidation the server
   * does for every action (ownership, resources, whose turn it is, valid target, kit
   * permission — technical spec §5.4).
   *
   * `false` means the action is **rejected as invalid**: the card is not consumed and no
   * cost is paid. Mirror played with no redirectable attack pending is the reference case
   * (ruling §6.2 #5).
   */
  canPlay(context: EffectContext): boolean;
  /**
   * Applies the card. An effect aimed at an opponent is *queued*, never applied here —
   * the engine resolves it on the target's turn, after that player has acted
   * (rules spec §6). A strictly personal effect resolves immediately.
   */
  play(context: EffectContext): void;
}
