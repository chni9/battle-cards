/**
 * Upgrade-point shop prices — rules spec §1, backlog L2-02 / L27-01.
 *
 * Globals for every kit without overrides. Upgrader overrides live on
 * `KitTraits.upgradePointBuyCost` / `upgradePointSellYield` (#V4-28): buy 5,
 * sell yield stays 7. Read via `getKit(player.kitId)` at use time — never
 * hardcode, never cache (Cloning mutates kitId).
 */

import type { KitId } from './kit';
import { getKit } from './kit-catalog';

export const UPGRADE_POINT_ECONOMY = {
  buyCostPoints: 10,
  sellYieldPoints: 7,
} as const;

/** Resolve buy cost for the actor's current kit (Upgrader: 5). */
export function upgradePointBuyCost(kitId: KitId): number {
  return getKit(kitId).traits.upgradePointBuyCost ?? UPGRADE_POINT_ECONOMY.buyCostPoints;
}

/** Resolve sell yield for the actor's current kit (Upgrader: 7). */
export function upgradePointSellYield(kitId: KitId): number {
  return getKit(kitId).traits.upgradePointSellYield ?? UPGRADE_POINT_ECONOMY.sellYieldPoints;
}
