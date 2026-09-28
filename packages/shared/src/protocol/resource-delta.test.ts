/**
 * Action-log resource nets — PROTOCOL_VERSION 41.
 */

import { describe, expect, it } from 'vitest';

import {
  fogPlayedResourceDeltas,
  logResourceDeltasFromNets,
  subtractDuplicatedGains,
} from './resource-delta';

describe('logResourceDeltasFromNets', () => {
  it('drops zeros and orders lives, points, upgrade points, shield', () => {
    expect(
      logResourceDeltasFromNets({
        lives: 0,
        points: 7,
        upgradePoints: -1,
        shield: 0,
      }),
    ).toEqual([
      { kind: 'point', amount: 7 },
      { kind: 'upgradePoint', amount: -1 },
    ]);
  });

  it('collapses a same-resource spend and gain to one net', () => {
    expect(
      logResourceDeltasFromNets({
        lives: 0,
        points: -3 + 10,
        upgradePoints: 0,
        shield: 0,
      }),
    ).toEqual([{ kind: 'point', amount: 7 }]);
  });

  it('removes duplicated gains from a public net', () => {
    expect(
      subtractDuplicatedGains(
        [{ kind: 'point', amount: 7 }],
        [{ kind: 'point', amount: 10 }],
      ),
    ).toEqual([{ kind: 'point', amount: -3 }]);
  });
});

describe('fogPlayedResourceDeltas', () => {
  it('keeps real nets for a viewer who sees the actor', () => {
    const deltas = [
      { kind: 'point' as const, amount: -5 },
      { kind: 'upgradePoint' as const, amount: 1 },
    ];
    expect(fogPlayedResourceDeltas('buyUpgradePoint', deltas, true, false)).toEqual(deltas);
  });

  it('conceals an unspied Draw point gain and hides a bust life total', () => {
    expect(
      fogPlayedResourceDeltas('draw', [{ kind: 'point', amount: 47 }], false, false),
    ).toEqual([{ kind: 'point', concealed: true, direction: 'gain' }]);
    expect(
      fogPlayedResourceDeltas('draw', [{ kind: 'life', amount: -14 }], false, true),
    ).toBeUndefined();
    expect(
      fogPlayedResourceDeltas('draw', [{ kind: 'life', amount: -14 }], true, true),
    ).toEqual([{ kind: 'life', amount: -14 }]);
  });

  it('omits an unspied shop-buy price and keeps a gain on that line', () => {
    expect(
      fogPlayedResourceDeltas('buyCard', [{ kind: 'point', amount: -2 }], false, false),
    ).toBeUndefined();
    expect(
      fogPlayedResourceDeltas(
        'buyCard',
        [
          { kind: 'life', amount: -2 },
          { kind: 'point', amount: 4 },
        ],
        false,
        false,
      ),
    ).toEqual([{ kind: 'point', amount: 4 }]);
    expect(
      fogPlayedResourceDeltas(
        'buyCard',
        [
          { kind: 'life', amount: -2 },
          { kind: 'point', amount: 4 },
        ],
        true,
        false,
      ),
    ).toEqual([
      { kind: 'life', amount: -2 },
      { kind: 'point', amount: 4 },
    ]);
  });

  it('omits an unspied card-sale payout and keeps it for a viewer who sees the seller', () => {
    const payout = [
      { kind: 'point' as const, amount: 6 },
      { kind: 'upgradePoint' as const, amount: 1 },
    ];
    expect(fogPlayedResourceDeltas('sellCard', payout, false, false)).toBeUndefined();
    expect(fogPlayedResourceDeltas('sellCard', [{ kind: 'life', amount: 1 }], false, false)).toBeUndefined();
    expect(fogPlayedResourceDeltas('sellCard', payout, true, false)).toEqual(payout);
  });

  it('conceals an unspied upgrade-point price and keeps the upgrade point', () => {
    expect(
      fogPlayedResourceDeltas(
        'buyUpgradePoint',
        [
          { kind: 'point', amount: -10 },
          { kind: 'upgradePoint', amount: 1 },
        ],
        false,
        false,
      ),
    ).toEqual([
      { kind: 'point', concealed: true, direction: 'loss' },
      { kind: 'upgradePoint', amount: 1 },
    ]);
  });
});
