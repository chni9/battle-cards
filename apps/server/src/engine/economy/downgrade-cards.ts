/**
 * Downgrade upgraded cards and related upgrade flags — technical spec v4 §4.2, L20-11, L21-02 / #V4-17.
 *
 * Upgrade Point Thief uses the returned count to grant 1 upgrade point per upgrade removed.
 * Nothing recomputes `isUpgraded` from the kit at read time, so the downgrade sticks until
 * a new copy is acquired (rules spec §5).
 *
 * #V4-17: also clears `shieldIsUpgraded` and `isUpgraded` on active persistent effects.
 */

import type { Player } from '@card-battle/shared';

/**
 * Sets `isUpgraded = false` on every hand and special card, clears the shield upgrade
 * flag, and clears upgrade flags on active persistents; returns how many upgrades were
 * removed.
 */
export function downgradeAllCards(victim: Player): number {
  let count = 0;

  for (const card of victim.hand) {
    if (card.isUpgraded) {
      card.isUpgraded = false;
      count += 1;
    }
  }

  for (const card of victim.specialCards) {
    if (card.isUpgraded) {
      card.isUpgraded = false;
      count += 1;
    }
  }

  if (victim.shieldIsUpgraded) {
    victim.shieldIsUpgraded = false;
    count += 1;
  }

  for (const effect of victim.activePersistentEffects) {
    if (effect.isUpgraded) {
      effect.isUpgraded = false;
      count += 1;
    }
  }

  return count;
}
