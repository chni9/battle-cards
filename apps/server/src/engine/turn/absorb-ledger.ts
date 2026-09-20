/**
 * Super Absorber ledger capture — rules spec §5, designer 2026-09-20 / L63-05.
 * Lives always; spend only when upgraded. Never theft. Never a multiplier.
 * Life gains clamp via grantLives.
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
  options: { includeSpend: boolean },
): void {
  const ledger = victim.turnLedger;
  grantLives(state, owner, ledger.livesLost, 'direct');

  if (!options.includeSpend) {
    return;
  }

  grantPoints(state, owner, ledger.pointsSpent, 'direct');
  grantUpgradePoints(state, owner, ledger.upgradePointsSpent, 'direct');
}
