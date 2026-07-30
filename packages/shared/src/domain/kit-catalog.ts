/**
 * Static V1 kit roster — rules spec §4, technical spec §4.1 / §4.5.
 *
 * Special card entries are ids only; definitions and handlers land in Lot 5.
 */

import type { Kit, KitId } from './kit';
import { KIT_IDS } from './kit';

const EMPTY_TRAITS = {
  alwaysUpgraded: [] as Kit['traits']['alwaysUpgraded'],
  immuneTo: [] as Kit['traits']['immuneTo'],
  allowsMultipleAttacksPerTurn: false,
} as const;

/**
 * Catalog keyed on kit id. Exhaustive: adding a KitId without an entry fails
 * the `satisfies` check below.
 */
export const KIT_CATALOG = {
  untouchable: {
    id: 'untouchable',
    name: 'Untouchable',
    startingResources: { lives: 10, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 5, attack: 2 },
    specialCards: ['spy-thief', 'imposition'],
    traits: {
      alwaysUpgraded: [],
      immuneTo: ['thief', 'spy'],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  kamikaze: {
    id: 'kamikaze',
    name: 'Kamikaze',
    startingResources: { lives: 4, points: 9, upgradePoints: 1, draw: 1 },
    startingCardCounts: { action: 7, attack: 2 },
    specialCards: ['suicide'],
    traits: { ...EMPTY_TRAITS },
  },
  scientific: {
    id: 'scientific',
    name: 'Scientific',
    startingResources: { lives: 10, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 5, attack: 2 },
    specialCards: ['cloning'],
    traits: {
      alwaysUpgraded: ['spy'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    startingResources: { lives: 10, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 4, attack: 4 },
    specialCards: ['sentence', 'points-generator'],
    traits: {
      alwaysUpgraded: [],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: true,
    },
  },
} as const satisfies Record<KitId, Kit>;

export function getKit(kitId: KitId): Kit {
  return KIT_CATALOG[kitId];
}

export function isKitId(value: string): value is KitId {
  return (KIT_IDS as readonly string[]).includes(value);
}
