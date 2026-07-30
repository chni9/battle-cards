/**
 * Buy / resell upgrade points — rules spec §1, backlog L2-02.
 */

import { UPGRADE_POINT_ECONOMY, type GameState } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

export type UpgradePointResult = { ok: true } | { ok: false; message: string };

export function buyUpgradePoint(state: GameState, actorPlayerId: string): UpgradePointResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const cost = UPGRADE_POINT_ECONOMY.buyCostPoints;

  if (actor.points < cost) {
    return { ok: false, message: 'Not enough points.' };
  }

  actor.points -= cost;
  actor.turnLedger.pointsSpent += cost;
  actor.upgradePoints += 1;

  return { ok: true };
}

export function sellUpgradePoint(state: GameState, actorPlayerId: string): UpgradePointResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  if (actor.upgradePoints < 1) {
    return { ok: false, message: 'No upgrade point to sell.' };
  }

  actor.upgradePoints -= 1;
  actor.points += UPGRADE_POINT_ECONOMY.sellYieldPoints;

  return { ok: true };
}
