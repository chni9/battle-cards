/**
 * Sell a held card copy into the shared pool — rules spec §1, backlog L2-01.
 */

import {
  actionReject,
  getSharedCard,
  type ActionReject,
  type CardId,
  type GameState,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { grantUpgradePoints } from './grant-resources';
import { grantYield } from './transfers';

export interface SellCardSuccess {
  ok: true;
  cardId: CardId;
}

export type SellCardRejection = ActionReject;

export type SellCardResult = SellCardSuccess | SellCardRejection;

export function sellCard(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
): SellCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const instanceIndex = actor.hand.findIndex((card) => card.instanceId === instanceId);

  if (instanceIndex < 0) {
    return actionReject('card-not-held');
  }

  const instance = actor.hand[instanceIndex];

  if (instance === undefined) {
    return actionReject('card-not-held');
  }

  const definition = getSharedCard(instance.cardId);

  if (definition === undefined) {
    return actionReject('card-not-sellable-individually');
  }

  actor.hand.splice(instanceIndex, 1);
  // Shop point/life yield ignores upgrade tier — always base sellYield (Lot 2 ruling).
  grantYield(state, actor, definition.sellYield);
  // Selling an upgraded copy refunds 1 upgrade point (designer ruling 2026-08-04),
  // including kit-permanent always-upgraded copies.
  if (instance.isUpgraded) {
    grantUpgradePoints(state, actor, 1, 'direct');
  }
  state.pool.push(instance);

  return { ok: true, cardId: instance.cardId };
}
