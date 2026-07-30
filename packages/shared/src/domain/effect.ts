/**
 * Delayed and persistent effects — technical spec §4.1 and §4.3, rules spec §5 and §6.
 */

import type { CardId } from './card';

/**
 * Why a player lost lives outside of an attack — the `reason` argument of
 * `applyLifeLoss` (technical spec §4.2).
 *
 * Holds the V1 non-attack sources of life loss only: Tax's play cost (rules spec §3),
 * buying Tax from the shop (Lot 2 ruling: 2 lives), Suicide and Imposition's ceded life
 * (rules spec §5). Damage never appears here — it goes through `applyDamage`.
 */
export const LIFE_LOSS_REASONS = ['tax', 'card-buy', 'suicide', 'imposition'] as const;

export type LifeLossReason = (typeof LIFE_LOSS_REASONS)[number];

/**
 * An effect queued against a player, resolved on that player's turn *after* they have
 * played their own action (rules spec §6). Held on the target's `pendingEffects`.
 *
 * `id` is not in technical spec §4.1's field list but the protocol requires it:
 * `chooseMirrorTarget` addresses a single queued effect by id (technical spec §5.2).
 */
export interface PendingEffect {
  id: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  /**
   * The global `GameState.turnSequence` value at queue time. Resolution order is
   * ascending `queuedAt` — a global counter, never per player.
   */
  queuedAt: number;
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
}
