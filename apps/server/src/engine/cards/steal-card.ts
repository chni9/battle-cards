/**
 * Card extraction and random theft — technical spec v4 §4.2, backlog L20-10.
 *
 * `takeCardFrom` removes an instance from the victim's hand or specials zone.
 * `stealRandomCard` draws from the injected `rng` (golden rule 5). Re-homing a
 * stolen instance goes through `transferCardInstance` so `alwaysUpgraded` applies.
 */

import type { CardInstance, Player } from '@card-battle/shared';

import type { Rng } from '../rng';

/** Remove a held instance by id. Searches hand first, then specials. */
export function takeCardFrom(
  victim: Player,
  instanceId: string,
): CardInstance | undefined {
  const handIndex = victim.hand.findIndex((card) => card.instanceId === instanceId);

  if (handIndex >= 0) {
    const [card] = victim.hand.splice(handIndex, 1);
    return card;
  }

  const specialIndex = victim.specialCards.findIndex(
    (card) => card.instanceId === instanceId,
  );

  if (specialIndex >= 0) {
    const [card] = victim.specialCards.splice(specialIndex, 1);
    return card;
  }

  return undefined;
}

/**
 * Steal a uniformly random card from the victim's hand and specials.
 * Optional `filter` narrows the pool (e.g. attack cards only).
 */
export function stealRandomCard(
  victim: Player,
  rng: Rng,
  filter?: (card: CardInstance) => boolean,
): CardInstance | undefined {
  const candidates = [...victim.hand, ...victim.specialCards].filter(
    (card) => filter === undefined || filter(card),
  );

  if (candidates.length === 0) {
    return undefined;
  }

  const picked = rng.pick(candidates);
  return takeCardFrom(victim, picked.instanceId);
}
