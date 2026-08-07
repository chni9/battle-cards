/**
 * Static special-card definitions — rules spec §5, technical spec v4 §8.1.
 *
 * Specials are not bought/sold individually (`buyCost` / `sellYield` keep the Card
 * shape but are unused by the shared shop). Play cost is the listed Price. Random
 * acquisition uses `buySpecialCard` over all `SPECIAL_CARD_IDS` (L21-01 / #V4-29).
 *
 * Every price re-verified against rules spec §5 at L20-04.
 *
 * `upgradeEffect` is the full player-facing description of the upgraded card (not a
 * delta). Non-upgraded UI appends it after the base `effect` via `formatCardEffectText`.
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
    'All opponents lose 5 lives and all points. You are not eliminated; you are the eliminator of opponents killed by this effect.',
  ),
  'spy-thief': specialCard(
    'spy-thief',
    'Spy Thief',
    5,
    'Steal all points from all opponents and spy on all of them.',
    'Steal all points from all opponents (doubled) and spy on all of them, seeing all of their resources.',
  ),
  imposition: specialCard(
    'imposition',
    'Imposition',
    6,
    'Each opponent gives 2 points per turn, or 1 life if they cannot (you gain it).',
    'Each opponent gives 4 points per turn, or 2 lives if they cannot (you gain it).',
  ),
  cloning: specialCard(
    'cloning',
    'Cloning',
    3,
    'Copy an opponent\'s kit, lives, points, upgrade points and shield; keep your own cards; cancel pending effects against you; reset visibility both ways.',
    'Copy an opponent\'s kit, lives, points, upgrade points and shield; keep your own cards; cancel pending effects against you; reset visibility both ways. Also gain 10 points, 2 upgrade points and 4 lives (life cap applies).',
  ),
  sentence: specialCard(
    'sentence',
    'Sentence',
    15,
    'Eliminate a randomly drawn player among everyone alive, including yourself.',
    'Eliminate a randomly drawn player among everyone alive except yourself.',
  ),
  'points-generator': specialCard(
    'points-generator',
    'Points Generator',
    5,
    'Generate 2 points per turn while the internal counter is not depleted.',
    'Generate 4 points per turn while the internal counter is not depleted.',
  ),
  'upgrade-point-thief': specialCard(
    'upgrade-point-thief',
    'Upgrade Point Thief',
    5,
    'Steal all unspent upgrade points from all opponents and remove the upgrade from all of their currently upgraded cards (1 UP each to you).',
    'Steal all unspent upgrade points from all opponents, remove the upgrade from all of their currently upgraded cards (1 UP each to you), and steal all of their current points.',
  ),
  block: specialCard(
    'block',
    'Block',
    5,
    'Cancel any action pending resolution against you, then play 3 consecutive turns (no attack cards).',
    'Cancel any action pending resolution against you, then play 7 consecutive turns (no attack cards).',
  ),
  'super-regeneration': specialCard(
    'super-regeneration',
    'Super Regeneration',
    6,
    'Gain 9 lives (life cap applies).',
    'Gain 18 lives (life cap applies).',
  ),
  'card-thief': specialCard(
    'card-thief',
    'Card Thief',
    5,
    'Steal a random card from a chosen opponent (choose the card if they are spied).',
    'Steal a card from every opponent (choose the card if they are spied).',
  ),
  'card-transformer': specialCard(
    'card-transformer',
    'Card Transformer',
    2,
    'Transform an owned action or attack card into a random special.',
    'Transform an owned action or attack card into a special of your choice.',
  ),
  invisibility: specialCard(
    'invisibility',
    'Invisibility',
    10,
    'Become immune to opposing actions and gain 4 points per turn; deactivate manually.',
    'Become immune to opposing actions and gain 6 points per turn; deactivate manually.',
  ),
  reanimation: specialCard(
    'reanimation',
    'Reanimation',
    8,
    'If you are eliminated later, return with a random kit and its starting resources.',
    'If you are eliminated later, return with a kit of your choice and its starting resources.',
  ),
  'card-absorber': specialCard(
    'card-absorber',
    'Card Absorber',
    4,
    'Recover 4 random cards from the shared pool.',
    'Recover 4 chosen cards from the shared pool.',
  ),
  'mega-attack': specialCard(
    'mega-attack',
    'MEGA ATTACK',
    16,
    'Attack every player for 20 damage (shield applies). Redirectable only by an upgraded Mirror.',
    'Attack every player for 20 damage (shield applies). Cannot be redirected.',
  ),
  'super-mirror': specialCard(
    'super-mirror',
    'Super Mirror',
    7,
    'Redirect every attack pending against you to all opponents, each independently. Not re-redirectable by a regular Mirror.',
    'Redirect every attack pending against you to all opponents, each independently, with doubled damage. Not re-redirectable by a regular Mirror.',
  ),
  'super-absorber': specialCard(
    'super-absorber',
    'Super Absorber',
    8,
    'Absorb all points, lives and upgrade points spent by all opponents while the counter holds.',
    'Absorb all points, lives and upgrade points spent by all opponents while the counter holds, doubled.',
  ),
  curse: specialCard(
    'curse',
    'Curse',
    8,
    'Curse an opponent: they lose 1 life per 3 points spent on their turn. A successful attack that deals life passes every Curse they hold to the hit player. Ends at 1 life or on death (permanently to the pool). Stacks.',
    'Curse an opponent: they lose 1 life per 2 points spent on their turn. A successful attack that deals life passes every Curse they hold to the hit player. Ends at 1 life or on death (permanently to the pool). Stacks.',
  ),
  poison: specialCard(
    'poison',
    'Poison',
    8,
    'All opponents lose 1 life per turn while the counter holds.',
    'All opponents lose 2 lives per turn while the counter holds.',
  ),
  'attack-thief': specialCard(
    'attack-thief',
    'Attack Thief',
    8,
    'Block one attack targeting you once, and steal a random attack card from each opponent.',
    'Block one attack targeting you once, and steal all attack cards from all opponents.',
  ),
} as const satisfies Record<SpecialCardId, Card>;

/** Specials that activate a persistent effect instead of joining the pool on play. */
export const PERSISTENT_SPECIAL_CARD_IDS = [
  'imposition',
  'points-generator',
  'poison',
  'curse',
  'super-absorber',
  'invisibility',
] as const;

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
