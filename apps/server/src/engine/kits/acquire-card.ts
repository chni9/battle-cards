/**
 * Card acquisition honouring kit `alwaysUpgraded` — technical spec §4.5, backlog L4-01.
 *
 * Every path that puts a card into a player's hand or specials zone must go through
 * these helpers so mid-game purchases, starting distribution, and later theft/rewards
 * stay consistent.
 */

import {
  getKit,
  isSpecialCardId,
  type CardId,
  type CardInstance,
  type Player,
} from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

function isAlwaysUpgraded(player: Player, cardId: CardId): boolean {
  return getKit(player.kitId).traits.alwaysUpgraded.includes(cardId);
}

/** Create a hand copy and push it. Applies `alwaysUpgraded` without spending upgrade points. */
export function acquireCardToHand(player: Player, cardId: CardId): CardInstance {
  const instance: CardInstance = {
    instanceId: randomUUID(),
    cardId,
    isUpgraded: isAlwaysUpgraded(player, cardId),
  };
  player.hand.push(instance);
  return instance;
}

/** Create a special-zone copy and push it. Same trait check as hand acquisition. */
export function acquireSpecialCard(player: Player, cardId: CardId): CardInstance {
  const instance: CardInstance = {
    instanceId: randomUUID(),
    cardId,
    isUpgraded: isAlwaysUpgraded(player, cardId),
  };
  player.specialCards.push(instance);
  return instance;
}

/**
 * Move an existing instance into the recipient's hand or specials zone.
 * Applies `alwaysUpgraded` without minting a new instanceId (elimination reward / theft).
 */
export function transferCardInstance(player: Player, instance: CardInstance): void {
  if (isAlwaysUpgraded(player, instance.cardId)) {
    instance.isUpgraded = true;
  }

  if (isSpecialCardId(instance.cardId)) {
    player.specialCards.push(instance);
    return;
  }

  player.hand.push(instance);
}
