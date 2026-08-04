/**
 * Downgrade all upgraded cards in hand and special cards — technical spec v4 §4.2.
 *
 * Upgrade Point Thief uses the returned count to grant 1 upgrade point per upgrade removed.
 * Nothing recomputes `isUpgraded` from the kit at read time, so the downgrade sticks until
 * a new copy is acquired (rules spec §5).
 */

import type { Player } from '@card-battle/shared';

/** Sets `isUpgraded = false` on every hand and special card; returns how many were upgraded. */
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

  return count;
}
