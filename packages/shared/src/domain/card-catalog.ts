/**
 * Static V1 shared-card definitions — rules spec §1–§3.
 *
 * Shop prices (`buyCost` / `sellYield`) are always base-cost transfers; upgraded play
 * cost never changes them (Lot 2 ruling). Specials are omitted: not bought/sold
 * individually (rules spec §5).
 */

import {
  type Card,
  type SharedCardId,
  SHARED_CARD_IDS,
} from './card';

function pointsCard(
  id: SharedCardId,
  name: string,
  type: 'attack' | 'action',
  playPoints: number,
  effect: string,
  upgradeEffect: string,
): Card {
  return {
    id,
    name,
    type,
    cost: { points: playPoints },
    effect,
    upgradeEffect,
    buyCost: { points: playPoints * 2 },
    sellYield: { points: playPoints },
  };
}

/**
 * Catalog keyed on shared card id. Exhaustive: adding a SharedCardId without an entry
 * fails the `satisfies` check below.
 */
export const SHARED_CARD_CATALOG = {
  'basic-attack': pointsCard(
    'basic-attack',
    'Basic attack',
    'attack',
    1,
    'Deal 1 damage to an opponent.',
    'Deal 3 damage to an opponent.',
  ),
  'strong-attack': pointsCard(
    'strong-attack',
    'Strong attack',
    'attack',
    2,
    'Deal 2 damage to an opponent.',
    'Deal 4 damage to an opponent.',
  ),
  'super-attack': pointsCard(
    'super-attack',
    'Super attack',
    'attack',
    10,
    'Deal 7 damage to an opponent.',
    'Deal 10 damage to an opponent.',
  ),
  absorber: pointsCard(
    'absorber',
    'Absorber',
    'action',
    3,
    "Gain the lives the target lost during their last complete turn.",
    'Also capture points and upgrade points they actively spent.',
  ),
  spy: pointsCard(
    'spy',
    'Spy',
    'action',
    4,
    "See the target's kit and cards for the rest of the game.",
    "Also see all of the target's resources.",
  ),
  thief: pointsCard(
    'thief',
    'Thief',
    'action',
    5,
    'Steal up to 10 points from the target.',
    'Target loses the stolen amount; you gain double.',
  ),
  mirror: pointsCard(
    'mirror',
    'Mirror',
    'action',
    6,
    'Redirect a non-upgraded attack pending against you.',
    'Also redirect upgraded attacks and double the redirected damage.',
  ),
  shield: pointsCard(
    'shield',
    'Shield',
    'action',
    7,
    'Gain 4 shield points. Only one shield at a time.',
    'Gain 7 shield points; blocks Thief and Spy at no shield cost.',
  ),
  tax: {
    id: 'tax',
    name: 'Tax',
    type: 'action',
    cost: { lives: 1 },
    effect: 'Gain 4 points. Always costs 1 life.',
    upgradeEffect: 'Gain 6 points for the same 1 life.',
    // Lot 2 ruling: buy = 2× life usage cost; sell = 1× life usage cost.
    buyCost: { lives: 2 },
    sellYield: { lives: 1 },
  },
  regeneration: {
    id: 'regeneration',
    name: 'Regeneration',
    type: 'action',
    cost: { pointsPerLife: 3 },
    effect: 'Buy up to 4 lives at 3 points each.',
    upgradeEffect: 'Cost reduced to 2 points per life; cap of 4 unchanged.',
    // Lot 2 ruling: shop uses 2× / 1× the base one-life usage cost (3 points).
    buyCost: { points: 6 },
    sellYield: { points: 3 },
  },
} as const satisfies Record<SharedCardId, Card>;

export function getSharedCard(cardId: string): Card | undefined {
  if ((SHARED_CARD_IDS as readonly string[]).includes(cardId)) {
    return SHARED_CARD_CATALOG[cardId as SharedCardId];
  }

  return undefined;
}

export function isSharedCardId(cardId: string): cardId is SharedCardId {
  return (SHARED_CARD_IDS as readonly string[]).includes(cardId);
}
