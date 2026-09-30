/**
 * Absorber ledger capture — rules spec §3 / §5, designer 2026-09-29 / Lot 68.
 * Lives always. Upgraded also copies every point and upgrade point that left,
 * including sales and theft. Shield is not on this ledger. Never a multiplier.
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

  grantPoints(state, owner, ledger.pointsSpent + ledger.pointsLostToTheft, 'direct');
  grantUpgradePoints(
    state,
    owner,
    ledger.upgradePointsSpent + ledger.upgradePointsLostToTheft,
    'direct',
  );
}
