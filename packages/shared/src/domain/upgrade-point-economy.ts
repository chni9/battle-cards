/**
 * Upgrade-point shop prices — rules spec §1, backlog L2-02.
 *
 * Kit Upgrader (out of V1) would lower buy cost to 5: read these fields, never
 * hardcode 10 in turn logic.
 */

export const UPGRADE_POINT_ECONOMY = {
  buyCostPoints: 10,
  sellYieldPoints: 7,
} as const;
