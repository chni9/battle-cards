/**
 * Kit identity, traits and static kit data — technical spec §4.1 and §4.5,
 * rules spec §4.
 *
 * The roster values themselves (lives, points, card counts per kit) are static data
 * belonging to lot 4, not to these types.
 */

import type { CardId } from './card';

/** The 4 kits in V1 scope (technical spec §2). The other 11 are out of scope (§9). */
export const KIT_IDS = ['untouchable', 'kamikaze', 'scientific', 'assassin'] as const;

export type KitId = (typeof KIT_IDS)[number];

export interface KitStartingResources {
  lives: number;
  points: number;
  upgradePoints: number;
  /** Points gained by the "draw" action (rules spec §6). Grants no card. */
  draw: number;
}

/** How many action and attack cards the kit starts with, drawn at random (rules spec §4). */
export interface KitStartingCardCounts {
  action: number;
  attack: number;
}

/**
 * Permanent properties a kit applies to a card *type*, not to a single copy
 * (technical spec §4.5).
 */
export interface KitTraits {
  /**
   * Card types that are always upgraded for this player, for every copy held,
   * whatever its origin — distribution, purchase, elimination reward, theft. Checked
   * on every acquisition, never a flag set once at distribution. Consumes no upgrade
   * point. Scientific: `['spy']`.
   */
  alwaysUpgraded: CardId[];
  /** Cards that have no effect on this player. Untouchable: `['thief', 'spy']`. */
  immuneTo: CardId[];
  /** Assassin only: several attack cards count as a single action (rules spec §4). */
  allowsMultipleAttacksPerTurn: boolean;
}

/** Static, immutable kit definition. */
export interface Kit {
  id: KitId;
  name: string;
  startingResources: KitStartingResources;
  startingCardCounts: KitStartingCardCounts;
  specialCards: CardId[];
  traits: KitTraits;
}
