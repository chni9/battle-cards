/**
 * Buy / resell upgrade points — rules spec §1, backlog L2-02 / L27-01.
 *
 * Per-kit overrides (#V4-28): read `getKit(actor.kitId)` at call time — never
 * cache, because Cloning mutates `player.kitId` mid-game.
 */

import {
  actionReject,
  type ActionReject,
  getKit,
  UPGRADE_POINT_ECONOMY,
  type GameState,
  type KitId,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { grantPoints, grantUpgradePoints } from './grant-resources';

export type UpgradePointResult = { ok: true } | ActionReject;

/** Resolve buy cost for the actor's current kit (Upgrader: 5). */
export function upgradePointBuyCost(kitId: KitId): number {
  return getKit(kitId).traits.upgradePointBuyCost ?? UPGRADE_POINT_ECONOMY.buyCostPoints;
}

/** Resolve sell yield for the actor's current kit (Upgrader: 7). */
export function upgradePointSellYield(kitId: KitId): number {
  return getKit(kitId).traits.upgradePointSellYield ?? UPGRADE_POINT_ECONOMY.sellYieldPoints;
}

export function buyUpgradePoint(state: GameState, actorPlayerId: string): UpgradePointResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const cost = upgradePointBuyCost(actor.kitId);

  if (actor.points < cost) {
    return actionReject('not-enough-points');
  }

  actor.points -= cost;
  actor.turnLedger.pointsSpent += cost;
  grantUpgradePoints(state, actor, 1, 'direct');

  return { ok: true };
}

export function sellUpgradePoint(state: GameState, actorPlayerId: string): UpgradePointResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (actor.upgradePoints < 1) {
    return actionReject('no-upgrade-point-to-sell');
  }

  actor.upgradePoints -= 1;
  grantPoints(state, actor, upgradePointSellYield(actor.kitId), 'direct');

  return { ok: true };
}
