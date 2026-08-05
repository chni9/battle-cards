/**
 * `scorePlayCard` family dispatch table — L29-01.
 *
 * Card families group the specials that L29-05..L29-08 will each give a real branch.
 * Any `CardId` not listed here (every V1 core card) stays `'core'`.
 */

import type { CardId } from '@card-battle/shared';

export type PlayCardFamily = 'core' | 'economy' | 'persistents' | 'attacks' | 'turnPool';

/** L29-05 — Upgrade Point Thief, Card Thief, Super Regeneration. */
const ECONOMY_THEFT_CARD_IDS: ReadonlySet<CardId> = new Set([
  'upgrade-point-thief',
  'card-thief',
  'super-regeneration',
]);

/**
 * L29-06 — Poison, Curse, Super Absorber, plus Sentence / Imposition / Spy Thief /
 * Points Generator (moved here from `'core'`, retuned in the same change — see
 * `score-persistents.ts` and decisions.md 2026-08-05). `cloning` outside an incoming
 * threat stays `'core'`: it is not persistent, just already branched there since L20-17.
 */
const PERSISTENTS_CARD_IDS: ReadonlySet<CardId> = new Set([
  'poison',
  'curse',
  'super-absorber',
  'sentence',
  'imposition',
  'spy-thief',
  'points-generator',
]);

/**
 * L29-07 — MEGA ATTACK, Super Mirror, Attack Thief. MEGA ATTACK moved here from
 * `'core'`: its `playCard` action never carries a `targetPlayerId` (the handler's
 * `canPlay` requires `targetPlayerId === null` — it hits every alive opponent at once),
 * so none of core's per-target `isAttackCardId` branches (mutual cancel, lethal-now,
 * burn counter, pressure) ever matched it. It needs its own multi-target branch —
 * see `score-attacks-redirect.ts`.
 */
const ATTACKS_REDIRECT_CARD_IDS: ReadonlySet<CardId> = new Set([
  'mega-attack',
  'super-mirror',
  'attack-thief',
]);

/** L29-08 — Block, Invisibility, Card Absorber, Card Transformer, Reanimation. */
const TURN_POOL_REVERSAL_CARD_IDS: ReadonlySet<CardId> = new Set([
  'block',
  'invisibility',
  'card-absorber',
  'card-transformer',
  'reanimation',
]);

export function playCardFamily(cardId: CardId): PlayCardFamily {
  if (ECONOMY_THEFT_CARD_IDS.has(cardId)) {
    return 'economy';
  }

  if (PERSISTENTS_CARD_IDS.has(cardId)) {
    return 'persistents';
  }

  if (ATTACKS_REDIRECT_CARD_IDS.has(cardId)) {
    return 'attacks';
  }

  if (TURN_POOL_REVERSAL_CARD_IDS.has(cardId)) {
    return 'turnPool';
  }

  return 'core';
}
