/**
 * Static V1 special-card definitions — rules spec §5.
 *
 * Specials are not bought/sold individually (`buyCost` / `sellYield` keep the Card
 * shape but are unused by the shared shop). Play cost is the listed Price. Random
 * acquisition uses `buySpecialCard` (20 points) among these six only (§6.2 #10).
 */

import {
  type Card,
  type SpecialCardId,
  SPECIAL_CARD_IDS,
} from './card';

function specialCard(
  id: SpecialCardId,
  name: string,
  playPoints: number,
  effect: string,
  upgradeEffect: string,
): Card {
  return {
    id,
    name,
    type: 'special',
    cost: { points: playPoints },
    effect,
    upgradeEffect,
    // Unused by shop — specials cannot be bought/sold individually (rules spec §5).
    buyCost: { points: playPoints * 2 },
    sellYield: { points: playPoints },
  };
}

/**
 * Catalog keyed on special card id. Exhaustive: adding a SpecialCardId without an
 * entry fails the `satisfies` check below.
 */
export const SPECIAL_CARD_CATALOG = {
  suicide: specialCard(
    'suicide',
    'Suicide',
    3,
    'Eliminated on your next turn. All opponents lose 5 lives and all points.',
    'You are not eliminated; you are the eliminator of opponents killed by this effect.',
  ),
  'spy-thief': specialCard(
    'spy-thief',
    'Spy Thief',
    5,
    'Steal all points from all opponents and spy on all of them.',
    'Stolen points are doubled; see all resources of all opponents.',
  ),
  imposition: specialCard(
    'imposition',
    'Imposition',
    6,
    'Each opponent gives 2 points per turn, or 1 life if they cannot (you gain it).',
    '4 points or 2 lives instead.',
  ),
  cloning: specialCard(
    'cloning',
    'Cloning',
    3,
    'Copy an opponent\'s kit, lives, points, upgrade points and shield; keep your own cards; cancel pending effects against you; reset visibility both ways.',
    'Also gain 10 points, 2 upgrade points and 4 lives (life cap applies).',
  ),
  sentence: specialCard(
    'sentence',
    'Sentence',
    15,
    'Eliminate a randomly drawn player among everyone alive, including yourself.',
    'You cannot be chosen by your own Sentence.',
  ),
  'points-generator': specialCard(
    'points-generator',
    'Points Generator',
    5,
    'Generate 2 points per turn while the internal counter is not depleted.',
    'Generate 4 points per turn.',
  ),
} as const satisfies Record<SpecialCardId, Card>;

/** Specials that activate a persistent effect instead of joining the pool on play. */
export const PERSISTENT_SPECIAL_CARD_IDS = ['imposition', 'points-generator'] as const;

export type PersistentSpecialCardId = (typeof PERSISTENT_SPECIAL_CARD_IDS)[number];

export function isPersistentSpecialCardId(cardId: string): cardId is PersistentSpecialCardId {
  return (PERSISTENT_SPECIAL_CARD_IDS as readonly string[]).includes(cardId);
}

export function getSpecialCard(cardId: string): Card | undefined {
  if ((SPECIAL_CARD_IDS as readonly string[]).includes(cardId)) {
    return SPECIAL_CARD_CATALOG[cardId as SpecialCardId];
  }

  return undefined;
}

export function isSpecialCardId(cardId: string): cardId is SpecialCardId {
  return (SPECIAL_CARD_IDS as readonly string[]).includes(cardId);
}
