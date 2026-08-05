/**
 * Kit identity, traits and static kit data — technical spec §4.1 and §4.5,
 * rules spec §4.
 *
 * The roster values themselves (lives, points, card counts per kit) are static data
 * belonging to lot 4, not to these types.
 */

import type { CardId } from './card';

/**
 * Growing kit roster (technical spec v4 §8.2). Full 15-kit close is L28-03;
 * Lot 27 appends data-only kits one task at a time.
 */
export const KIT_IDS = [
  'untouchable',
  'kamikaze',
  'scientific',
  'assassin',
  'indestructible',
  'specialist',
  'witch',
  'wizard',
  'juggernaut',
  'ghost',
  'duplicator',
] as const;

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
