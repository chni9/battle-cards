/**
 * Chosen spend for Absorber's turn ledger and match recap (L59-03).
 * Never use this for theft — theft writes `pointsLostToTheft` only.
 */

import type { Player } from '@card-battle/shared';

export function recordChosenPointsSpent(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }

  player.turnLedger.pointsSpent += amount;
  player.matchStats.pointsSpent += amount;
}

export function recordChosenUpgradePointsSpent(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }

  player.turnLedger.upgradePointsSpent += amount;
  player.matchStats.upgradePointsSpent += amount;
}
