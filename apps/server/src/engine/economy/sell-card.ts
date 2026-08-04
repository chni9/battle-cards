/**
 * Sell a held card copy into the shared pool — rules spec §1, backlog L2-01.
 */

import { getSharedCard, type CardId, type GameState } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { grantYield } from './transfers';

export interface SellCardSuccess {
  ok: true;
  cardId: CardId;
}

export interface SellCardRejection {
  ok: false;
  message: string;
}

export type SellCardResult = SellCardSuccess | SellCardRejection;

export function sellCard(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
): SellCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const instanceIndex = actor.hand.findIndex((card) => card.instanceId === instanceId);

  if (instanceIndex < 0) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const instance = actor.hand[instanceIndex];

  if (instance === undefined) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  const definition = getSharedCard(instance.cardId);

  if (definition === undefined) {
    return { ok: false, message: 'That card cannot be sold individually.' };
  }

  actor.hand.splice(instanceIndex, 1);
  // Shop point/life yield ignores upgrade tier — always base sellYield (Lot 2 ruling).
  grantYield(state, actor, definition.sellYield);
  // Selling an upgraded copy refunds 1 upgrade point (designer ruling 2026-08-04),
  // including kit-permanent always-upgraded copies.
  if (instance.isUpgraded) {
    actor.upgradePoints += 1;
  }
  state.pool.push(instance);

  return { ok: true, cardId: instance.cardId };
}
