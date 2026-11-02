/**
 * Chosen spend for Absorber's turn ledger and match recap (L60-03).
 * Never use this for theft — theft writes `pointsLostToTheft` only.
 */

import type { Player } from '@card-battle/shared';

import { returnSpentPoints } from './gain-points';

export function recordChosenPointsSpent(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }

  player.turnLedger.pointsSpent += amount;
  player.matchStats.pointsSpent += amount;
}

/** Undo a play payment the player cancelled, as if it was never spent (L82-03). */
export function refundChosenPointsSpent(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }

  returnSpentPoints(player, amount);
  player.turnLedger.pointsSpent -= amount;
  player.matchStats.pointsSpent -= amount;
}

export function recordChosenUpgradePointsSpent(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }

  player.turnLedger.upgradePointsSpent += amount;
  player.matchStats.upgradePointsSpent += amount;
}
