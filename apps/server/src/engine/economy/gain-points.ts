/**
 * The single way a player ever gains points — technical spec v4 §4.2.
 *
 * Every source of gain goes through here: draw, Tax, Absorber, Imposition,
 * elimination rewards, sale yield, theft, and upgraded Cloning. There is no
 * life cap on points — do not clamp like `gainLives`.
 */

import type { Player } from '@card-battle/shared';

export type PointGainOrigin = 'direct' | 'duplicated';

/**
 * Grants `amount` points to `player`. `origin` is consumed by the grant wrappers
 * (`grantPoints` / Duplicator observe); this primitive stays kit-agnostic —
 * `void origin` is still ok (technical spec v4 §4.2).
 */
export function gainPoints(
  player: Player,
  amount: number,
  origin: PointGainOrigin,
): void {
  void origin;

  if (amount < 0) {
    throw new RangeError(`gainPoints received a negative amount: ${amount}`);
  }

  player.points += amount;
}
