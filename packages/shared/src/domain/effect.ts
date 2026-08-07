/**
 * Delayed and persistent effects — technical spec §4.1 and §4.3, rules spec §5 and §6.
 */

import type { CardId } from './card';

/**
 * Why a player lost lives outside of an attack — the `reason` argument of
 * `applyLifeLoss` (technical spec §4.2).
 *
 * Non-attack sources: Tax's play cost (rules spec §3), buying Tax from the shop
 * (Lot 2 ruling: 2 lives), Suicide, Imposition's ceded life, Poison ticks and
 * Curse spend ticks (rules spec §5). Damage never appears here — it goes through
 * `applyDamage`.
 */
export const LIFE_LOSS_REASONS = [
  'tax',
  'card-buy',
  'suicide',
  'imposition',
  'poison',
  'curse',
] as const;

export type LifeLossReason = (typeof LIFE_LOSS_REASONS)[number];

/** How a pending attack arrived at its current target — technical spec v4 §4.7. */
export const PENDING_EFFECT_REDIRECT_SOURCES = ['mirror', 'super-mirror'] as const;

export type PendingEffectRedirectSource = (typeof PENDING_EFFECT_REDIRECT_SOURCES)[number];

/**
 * An effect queued against a player, resolved on that player's turn *after* they have
 * played their own action (rules spec §6). Held on the target's `pendingEffects`.
 *
 * `id` is not in technical spec §4.1's field list but the protocol requires it:
 * `chooseMirrorTarget` addresses a single queued effect by id (technical spec §5.2).
 */
export interface PendingEffect {
  id: string;
  /**
   * Who the attack is attributed to for mutual pairing, damage resolution and
   * eliminator rewards. On a direct queue this is the player who played the card.
   * After Mirror / Super Mirror redirect it becomes the redirector (rules spec §6 —
   * a redirected attack is an attack from the Mirror user).
   */
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  /**
   * The global `GameState.turnSequence` value at queue time. Resolution order is
   * ascending `queuedAt` — a global counter, never per player.
   */
  queuedAt: number;
  /**
   * Damage scale for attack effects. Default 1; upgraded Mirror multiplies by 2 on
   * each redirect and stacks (Lot 3 ruling).
   */
  damageMultiplier: number;
  /**
   * Provenance when an attack was redirected — `null` for a direct queue.
   * Super-mirror redirects are ineligible for Mirror; mirror redirects may be
   * re-mirrored (technical spec v4 §4.7).
   */
  redirectedBy: PendingEffectRedirectSource | null;
  /**
   * Card Thief steal lock — set when the thief chose a card while the victim was
   * spied; `null` means steal randomly at resolve (L21-03 / #V4-35).
   *
   * **Server-only — never include it in `PendingEffectView`.** Publishing it would
   * leak the stolen card's identity to seats that must not see it (tech v4 §5).
   */
  chosenInstanceId: string | null;
}

/**
 * A special card activated once and then active until a deactivation condition
 * (rules spec §5). Held on the `activePersistentEffects` of the player who used it,
 * even when the effect acts on opponents.
 */
export interface PersistentEffect {
  id: string;
  cardId: CardId;
  isUpgraded: boolean;
  /**
   * The card's dedicated internal counter, its "card lives" (rules spec §5): it
   * decrements by 1 whenever the *user* loses a life to damage, and the card
   * deactivates and is permanently lost when it reaches 0. `null` for a persistent
   * card with no counter.
   *
   * This counter does not protect its user — damage still reaches them normally.
   * Only `applyDamage` ever decrements it, never `applyLifeLoss`.
   */
  counter: number | null;
  /**
   * Legacy single-target field. Curse is victim-owned (L32-01) with this null;
   * other persistents are owner-scoped or all-opponents and also leave it null.
   * Public via `PersistentEffectView`.
   */
  targetPlayerId: string | null;
}
