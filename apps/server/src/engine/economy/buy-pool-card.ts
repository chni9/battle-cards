/**
 * Buy one uniform-random pool card — rules spec §1, L58-05.
 *
 * Table-wide fee starts at `POOL_BUY_INITIAL_COST` and doubles after every
 * successful buy; it never resets (empty pool included). Card Absorber uses
 * `recoverCardsFromPool` directly and must not call this.
 */

import {
  actionReject,
  type ActionReject,
  type CardInstance,
  type GameState,
} from '@card-battle/shared';

import type { Rng } from '../rng';
import { findPlayer } from '../turn/advance-turn';
import { recoverCardsFromPool } from '../turn/generic-sub-choice';
import { payCost } from './transfers';

export type BuyPoolCardResult =
  | { ok: true; instance: CardInstance }
  | ActionReject;

export function buyPoolCard(
  state: GameState,
  actorPlayerId: string,
  rng: Rng,
): BuyPoolCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (state.pool.length < 1) {
    return actionReject('empty-pool');
  }

  const fee = state.poolBuyCost;
  const paid = payCost(state, actor, { points: fee });

  if (!paid.ok) {
    return paid;
  }

  const picked = rng.pick(state.pool);
  recoverCardsFromPool(state, actorPlayerId, [picked.instanceId]);
  state.poolBuyCost = fee * 2;
  return { ok: true, instance: picked };
}
