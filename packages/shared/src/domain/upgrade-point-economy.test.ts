/**
 * Shared upgrade-point prices — rules spec §1 / L43-02.
 */

import { describe, expect, it } from 'vitest';

import {
  UPGRADE_POINT_ECONOMY,
  upgradePointBuyCost,
  upgradePointSellYield,
} from './upgrade-point-economy';

describe('upgradePointBuyCost / sellYield (L43-02)', () => {
  it('uses catalog globals when the kit has no override', () => {
    expect(upgradePointBuyCost('indestructible')).toBe(UPGRADE_POINT_ECONOMY.buyCostPoints);
    expect(upgradePointSellYield('indestructible')).toBe(UPGRADE_POINT_ECONOMY.sellYieldPoints);
    expect(UPGRADE_POINT_ECONOMY.buyCostPoints).toBe(10);
    expect(UPGRADE_POINT_ECONOMY.sellYieldPoints).toBe(7);
  });

  it('uses Upgrader kit overrides', () => {
    expect(upgradePointBuyCost('upgrader')).toBe(5);
    expect(upgradePointSellYield('upgrader')).toBe(7);
  });
});
