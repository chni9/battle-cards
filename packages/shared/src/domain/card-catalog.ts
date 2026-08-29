/**
 * Static V1 shared-card definitions — rules spec §1–§3.
 *
 * Shop prices (`buyCost` / `sellYield`) are always base-cost transfers; upgraded play
 * cost never changes them (Lot 2 ruling). Specials live in `special-card-catalog.ts`.
 *
 * `upgradeEffect` is the full player-facing description of the upgraded card (not a
 * delta). Non-upgraded UI appends `upgradeAdds` after the base `effect`.
 */

import {
  type Card,
  type CardId,
  type SharedCardId,
  SHARED_CARD_IDS,
} from './card';
import { getSpecialCard } from './special-card-catalog';

function pointsCard(
  id: SharedCardId,
  name: string,
  type: 'attack' | 'action',
  playPoints: number,
  effect: string,
  upgradeEffect: string,
  upgradeAdds: string,
): Card {
  return {
    id,
    name,
    type,
    cost: { points: playPoints },
    effect,
    upgradeEffect,
    upgradeAdds,
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
    'Deal 3 damage instead of 1.',
  ),
  'strong-attack': pointsCard(
    'strong-attack',
    'Strong attack',
    'attack',
    2,
    'Deal 2 damage to an opponent.',
    'Deal 4 damage to an opponent.',
    'Deal 4 damage instead of 2.',
  ),
  'super-attack': pointsCard(
    'super-attack',
    'Super attack',
    'attack',
    10,
    'Deal 7 damage to an opponent.',
    'Deal 10 damage to an opponent.',
    'Deal 10 damage instead of 7.',
  ),
  absorber: pointsCard(
    'absorber',
    'Absorber',
    'action',
    3,
    'Gain the lives the target lost during their last complete turn.',
    'Gain the lives the target lost during their last complete turn, and also capture points and upgrade points they actively spent.',
    'Also capture points and upgrade points they actively spent.',
  ),
  spy: pointsCard(
    'spy',
    'Spy',
    'action',
    4,
    "See the target's kit and cards for the rest of the game.",
    "See the target's kit, cards and all resources for the rest of the game.",
    'Also see live lives, points, upgrade points, and shield.',
  ),
  thief: pointsCard(
    'thief',
    'Thief',
    'action',
    5,
    'Steal up to 10 points from the target.',
    'Target loses up to 10 points; you gain double that amount.',
    'You gain double the points the target loses.',
  ),
  mirror: pointsCard(
    'mirror',
    'Mirror',
    'action',
    6,
    'Redirect a non-upgraded attack pending against you.',
    'Redirect any attack pending against you (including upgraded) and double the redirected damage.',
    'Redirect upgraded attacks too, and double the redirected damage.',
  ),
  shield: pointsCard(
    'shield',
    'Shield',
    'action',
    7,
    'Gain 4 shield points. Only one shield at a time.',
    'Gain 7 shield points; blocks Thief and Spy at no shield cost. Only one shield at a time.',
    'Gain 7 shield instead of 4; also blocks Thief and Spy at no shield cost.',
  ),
  tax: {
    id: 'tax',
    name: 'Tax',
    type: 'action',
    cost: { lives: 1 },
    effect: 'Gain 4 points. Always costs 1 life.',
    upgradeEffect: 'Gain 6 points. Always costs 1 life.',
    upgradeAdds: 'Gain 6 points instead of 4.',
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
    upgradeEffect: 'Buy up to 4 lives at 2 points each.',
    upgradeAdds: 'Lives cost 2 points each instead of 3.',
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

/** Shared or special catalog lookup — play payment and UI definitions. */
export function getCard(cardId: CardId): Card | undefined {
  return getSharedCard(cardId) ?? getSpecialCard(cardId);
}

export function isSharedCardId(cardId: string): cardId is SharedCardId {
  return (SHARED_CARD_IDS as readonly string[]).includes(cardId);
}
