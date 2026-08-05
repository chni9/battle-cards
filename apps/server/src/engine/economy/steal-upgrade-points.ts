/**
 * Steal upgrade points from a target — rules spec §3 Upgrade Point Thief.
 *
 * First writer of `TurnLedger.upgradePointsLostToTheft` so upgraded Absorber never
 * confuses theft with active spend (technical spec §4.4).
 */

import type { GameState, Player } from '@card-battle/shared';

import { grantUpgradePoints } from './grant-resources';

/** Moves all of `target`'s upgrade points to `source`; returns the amount taken. */
export function stealUpgradePoints(
  state: GameState,
  source: Player,
  target: Player,
): number {
  const taken = target.upgradePoints;
  target.upgradePoints = 0;
  target.turnLedger.upgradePointsLostToTheft += taken;

  grantUpgradePoints(state, source, taken, 'direct');

  return taken;
}
