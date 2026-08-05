/**
 * Static kit roster — rules spec §4, technical spec v4 §8.2.
 *
 * Special card entries are ids only; handlers must exist before a kit is added
 * (backlog Lot 27 sequencing).
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
  indestructible: {
    id: 'indestructible',
    name: 'Indestructible',
    startingResources: { lives: 18, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 4, attack: 1 },
    specialCards: ['super-regeneration'],
    traits: {
      alwaysUpgraded: ['tax', 'regeneration'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  specialist: {
    id: 'specialist',
    name: 'Specialist',
    startingResources: { lives: 8, points: 4, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 3, attack: 2 },
    specialCards: [
      'card-transformer',
      'card-transformer',
      'card-thief',
      'super-absorber',
    ],
    traits: {
      alwaysUpgraded: ['absorber'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    startingResources: { lives: 10, points: 0, upgradePoints: 1, draw: 1 },
    startingCardCounts: { action: 5, attack: 2 },
    specialCards: ['reanimation', 'poison'],
    traits: {
      alwaysUpgraded: ['thief'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    startingResources: { lives: 10, points: 4, upgradePoints: 0, draw: 2 },
    startingCardCounts: { action: 4, attack: 2 },
    specialCards: ['mega-attack'],
    traits: {
      alwaysUpgraded: ['thief'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
} as const satisfies Record<KitId, Kit>;

export function getKit(kitId: KitId): Kit {
  return KIT_CATALOG[kitId];
}

export function isKitId(value: string): value is KitId {
  return (KIT_IDS as readonly string[]).includes(value);
}
