/**
 * The single way a player ever gains lives — rules spec §7, technical spec §6.3.
 *
 * Every source of gain goes through here: Regeneration, Absorber, Imposition,
 * elimination rewards, upgraded Cloning. The cap is a parameter read from
 * `GameState.lifeLimit`, never the `CLASSIC_LIFE_LIMIT` constant, so the per-mode caps
 * of rules spec §7 stay out of the rules logic.
 */

import type { Player } from '@card-battle/shared';

import type { LifeGainOutcome } from './outcome';

/**
 * Grants up to `amount` lives to `target`, clamped so their total never exceeds
 * `lifeLimit`. Any excess is lost, not carried over (rules spec §7).
 */
export function gainLives(target: Player, amount: number, lifeLimit: number): LifeGainOutcome {
  if (amount < 0) {
    // A negative amount would make a gain into a life loss, bypassing both loss
    // primitives and everything they enforce.
    throw new RangeError(`gainLives received a negative amount: ${amount}`);
  }

  const livesGained = Math.max(0, Math.min(amount, lifeLimit - target.lives));
  target.lives += livesGained;

  return { livesGained, livesWasted: amount - livesGained };
}
