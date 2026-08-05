/**
 * Kit identity, traits and static kit data — technical spec §4.1 and §4.5,
 * rules spec §4.
 *
 * The roster values themselves (lives, points, card counts per kit) are static data
 * belonging to lot 4, not to these types.
 */

import type { CardId } from './card';

/**
 * Growing kit roster (technical spec v4 §8.2). L28-03 asserts catalog/art
 * exhaustiveness; the V4 closed count is 15 once Lot 27's remaining kits land.
 */
export const KIT_IDS = [
  'untouchable',
  'kamikaze',
  'scientific',
  'assassin',
  'upgrader',
  'tactician',
  'indestructible',
  'prophet',
  'specialist',
  'witch',
  'warrior',
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
  /**
   * Per-kit override for upgrade-point buy cost in points. Absent → global
   * `UPGRADE_POINT_ECONOMY.buyCostPoints`. Upgrader: 5 (#V4-28 / L27-01).
   * Read via `getKit(player.kitId)` at use sites — never cache (Cloning mutates kitId).
   */
  upgradePointBuyCost?: number;
  /**
   * Per-kit override for upgrade-point sell yield in points. Absent → global
   * `UPGRADE_POINT_ECONOMY.sellYieldPoints`. Upgrader: 7 (#V4-28 / L27-01).
   */
  upgradePointSellYield?: number;
}

/** Static, immutable kit definition. */
export interface Kit {
  id: KitId;
  name: string;
  startingResources: KitStartingResources;
  startingCardCounts: KitStartingCardCounts;
  specialCards: CardId[];
  /**
   * When set, deal this many specials via seeded `rng.pick` over all specials
   * (with replacement per #V4-27) instead of `specialCards`. Prophet: 2.
   * `specialCards` stays empty for that kit. technical spec v4 §4.8.
   */
  randomStartingSpecialCount?: number;
  traits: KitTraits;
}
