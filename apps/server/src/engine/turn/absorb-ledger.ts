/**
 * Super Absorber ledger capture — rules spec §5, #V4-21, designer 2026-08-07.
 * Reads spend + livesLost; never theft fields. Life gains clamp via grantLives.
 */

import type { GameState, Player } from '@card-battle/shared';

import {
  grantLives,
  grantPoints,
  grantUpgradePoints,
} from '../economy/grant-resources';

export function absorbLedgerFromVictim(
  state: GameState,
  owner: Player,
  victim: Player,
  multiplier: number,
): void {
  const ledger = victim.turnLedger;
  grantPoints(state, owner, ledger.pointsSpent * multiplier, 'direct');
  grantUpgradePoints(state, owner, ledger.upgradePointsSpent * multiplier, 'direct');
  grantLives(state, owner, ledger.livesLost * multiplier, 'direct');
}
