/**
 * The single way a player ever gains upgrade points — technical spec v4 §4.2.
 *
 * Every source of gain goes through here: buy/sell economy, Absorber,
 * elimination rewards, and upgraded Cloning.
 */

import type { Player } from '@card-battle/shared';

import type { PointGainOrigin } from './gain-points';

/**
 * Grants `amount` upgrade points to `player`. `origin` is required so Duplicator
 * can observe direct gains only and avoid duplication loops (technical spec v4 §4.2).
 */
export function gainUpgradePoints(
  player: Player,
  amount: number,
  origin: PointGainOrigin,
): void {
  void origin;

  if (amount < 0) {
    throw new RangeError(`gainUpgradePoints received a negative amount: ${amount}`);
  }

  player.upgradePoints += amount;
}
