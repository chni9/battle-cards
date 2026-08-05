/**
 * `scorePlayCard` family dispatch table — L29-01.
 *
 * Card families group the specials that L29-05..L29-08 will each give a real branch.
 * Any `CardId` not listed here (including every V1 core card and MEGA ATTACK, which
 * still scores through the shared `isAttackCardId` paths — see backlog watch point on
 * L29-01) stays `'core'`.
 */

import type { CardId } from '@card-battle/shared';

export type PlayCardFamily = 'core' | 'economy' | 'persistents' | 'attacks' | 'turnPool';

/** L29-05 — Upgrade Point Thief, Card Thief, Super Regeneration. */
const ECONOMY_THEFT_CARD_IDS: ReadonlySet<CardId> = new Set([
  'upgrade-point-thief',
  'card-thief',
  'super-regeneration',
]);

/** L29-06 — Poison, Curse, Super Absorber only. Sentence/Imposition/Spy Thief/Points */
/** Generator and Cloning-outside-threat stay `'core'` for L29-01 (already branched there). */
const PERSISTENTS_CARD_IDS: ReadonlySet<CardId> = new Set(['poison', 'curse', 'super-absorber']);

/**
 * L29-07 — Super Mirror, Attack Thief only. MEGA ATTACK is deliberately excluded: it
 * must stay routed to `'core'` so it keeps scoring through the existing `isAttackCardId`
 * branches (mutual cancel, lethal-now, burn counter, pressure) with zero behaviour change.
 */
const ATTACKS_REDIRECT_CARD_IDS: ReadonlySet<CardId> = new Set(['super-mirror', 'attack-thief']);

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
