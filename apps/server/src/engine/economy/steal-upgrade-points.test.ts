/**
 * stealUpgradePoints — technical spec v4 §4.2, L20-11.
 */

import { describe, expect, it } from 'vitest';

import { makePlayer } from '../../testing/factories';
import { stealUpgradePoints } from './steal-upgrade-points';

describe('stealUpgradePoints (technical spec v4 §4.2, L20-11)', () => {
  it('moves all upgrade points to the source and records theft on the target ledger', () => {
    const source = makePlayer({ id: 'thief', upgradePoints: 2 });
    const target = makePlayer({ id: 'victim', upgradePoints: 5 });

    const taken = stealUpgradePoints(source, target);

    expect(taken).toBe(5);
    expect(target.upgradePoints).toBe(0);
    expect(target.turnLedger.upgradePointsLostToTheft).toBe(5);
    expect(source.upgradePoints).toBe(7);
  });

  it('is a no-op when the target has no upgrade points', () => {
    const source = makePlayer({ id: 'thief', upgradePoints: 1 });
    const target = makePlayer({ id: 'victim', upgradePoints: 0 });

    const taken = stealUpgradePoints(source, target);

    expect(taken).toBe(0);
    expect(target.turnLedger.upgradePointsLostToTheft).toBe(0);
    expect(source.upgradePoints).toBe(1);
  });
});
