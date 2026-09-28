import { describe, expect, it } from 'vitest';

import { MAX_POINT_FLYOUTS, pointFlyoutCount } from './motion-timing';

describe('pointFlyoutCount', () => {
  it('caps a huge point delta at 50 chips', () => {
    expect(pointFlyoutCount('point', 100)).toBe(MAX_POINT_FLYOUTS);
    expect(pointFlyoutCount('point', 50)).toBe(50);
    expect(pointFlyoutCount('point', 1)).toBe(1);
  });

  it('does not cap other resources', () => {
    expect(pointFlyoutCount('life', 2)).toBe(2);
    expect(pointFlyoutCount('shield', 60)).toBe(60);
    expect(pointFlyoutCount('upgradePoint', 3)).toBe(3);
  });
});
