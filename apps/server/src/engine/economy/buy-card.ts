/**
 * Buy a shared card from infinite stock — rules spec §1, backlog L2-01.
 */

import {
  getSharedCard,
  isSharedCardId,
  type CardId,
  type CardInstance,
  type GameState,
} from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

import { findPlayer } from '../turn/advance-turn';
import { payCost } from './transfers';

export interface BuyCardSuccess {
  ok: true;
  cardId: CardId;
  instance: CardInstance;
}

export interface BuyCardRejection {
  ok: false;
  message: string;
}

export type BuyCardResult = BuyCardSuccess | BuyCardRejection;

export function buyCard(state: GameState, actorPlayerId: string, cardId: CardId): BuyCardResult {
  if (!isSharedCardId(cardId)) {
    return { ok: false, message: 'That card cannot be bought individually.' };
  }

  const definition = getSharedCard(cardId);

  if (definition === undefined) {
    return { ok: false, message: 'Unknown card.' };
  }

  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const paid = payCost(state, actor, definition.buyCost);

  if (!paid.ok) {
    return paid;
  }

  const instance: CardInstance = {
    instanceId: randomUUID(),
    cardId,
    isUpgraded: false,
  };

  actor.hand.push(instance);

  return { ok: true, cardId, instance };
}
