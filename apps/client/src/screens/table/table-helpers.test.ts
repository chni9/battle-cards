/**
 * Target picker for base Spy Thief — Lot 71.
 * The upgrade hits every living opponent and stays untargeted.
 */

import { describe, expect, it } from 'vitest';

import { cardPlayNeedsTarget } from './table-helpers';

describe('cardPlayNeedsTarget (Lot 71)', () => {
  it('asks for one opponent on base Spy Thief and not on the upgrade', () => {
    expect(cardPlayNeedsTarget('spy-thief', false)).toBe(true);
    expect(cardPlayNeedsTarget('spy-thief', true)).toBe(false);
    expect(cardPlayNeedsTarget('upgrade-point-thief', false)).toBe(true);
    expect(cardPlayNeedsTarget('upgrade-point-thief', true)).toBe(false);
  });
});
