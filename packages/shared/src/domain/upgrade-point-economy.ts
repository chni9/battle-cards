/**
 * Upgrade-point shop prices — rules spec §1, backlog L2-02 / L27-01.
 *
 * Globals for every kit without overrides. Upgrader overrides live on
 * `KitTraits.upgradePointBuyCost` / `upgradePointSellYield` (#V4-28): buy 5,
 * sell yield stays 7. Read via `getKit(player.kitId)` at the three production
 * sites — never hardcode, never cache (Cloning mutates kitId).
 */

export const UPGRADE_POINT_ECONOMY = {
  buyCostPoints: 10,
  sellYieldPoints: 7,
} as const;
