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
  upgrader: {
    id: 'upgrader',
    name: 'Upgrader',
    startingResources: { lives: 10, points: 0, upgradePoints: 3, draw: 1 },
    startingCardCounts: { action: 4, attack: 2 },
    specialCards: ['upgrade-point-thief'],
    traits: {
      alwaysUpgraded: [],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
      // #V4-28: buy 5, sell yield stays 7 (designer ruling 2026-08-05).
      upgradePointBuyCost: 5,
      upgradePointSellYield: 7,
    },
  },
  tactician: {
    id: 'tactician',
    name: 'Tactician',
    startingResources: { lives: 1, points: 15, upgradePoints: 0, draw: 4 },
    startingCardCounts: { action: 2, attack: 2 },
    specialCards: ['block'],
    traits: {
      alwaysUpgraded: ['spy', 'thief', 'mirror'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
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
  prophet: {
    id: 'prophet',
    name: 'Prophet',
    startingResources: { lives: 10, points: 4, upgradePoints: 2, draw: 1 },
    startingCardCounts: { action: 5, attack: 2 },
    // Fixed list empty — deal path draws via randomStartingSpecialCount (#V4-27).
    specialCards: [],
    randomStartingSpecialCount: 2,
    traits: { ...EMPTY_TRAITS },
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
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    startingResources: { lives: 14, points: 4, upgradePoints: 1, draw: 1 },
    startingCardCounts: { action: 4, attack: 2 },
    specialCards: ['super-mirror'],
    traits: {
      alwaysUpgraded: ['shield'],
      immuneTo: [],
      allowsMultipleAttacksPerTurn: false,
    },
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    startingResources: { lives: 14, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 4, attack: 2 },
    specialCards: ['curse'],
    traits: { ...EMPTY_TRAITS },
  },
  duplicator: {
    id: 'duplicator',
    name: 'Duplicator',
    startingResources: { lives: 2, points: 0, upgradePoints: 0, draw: 1 },
    startingCardCounts: { action: 1, attack: 0 },
    specialCards: ['imposition', 'attack-thief'],
    traits: { ...EMPTY_TRAITS },
  },
} as const satisfies Record<KitId, Kit>;

export function getKit(kitId: KitId): Kit {
  return KIT_CATALOG[kitId];
}

export function isKitId(value: string): value is KitId {
  return (KIT_IDS as readonly string[]).includes(value);
}
