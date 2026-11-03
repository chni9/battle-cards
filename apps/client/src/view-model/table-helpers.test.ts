/**
 * Target picker for base Spy Thief — Lot 71.
 * The upgrade hits every living opponent and stays untargeted.
 */

import { describe, expect, it } from 'vitest';

import { buildRewardChoice, cardPlayNeedsTarget, REWARD_KIND_COSTS, REWARD_KIND_LABELS, REWARD_KINDS } from './table-helpers';

describe('cardPlayNeedsTarget (Lot 71)', () => {
  it('asks for one opponent on base Spy Thief and not on the upgrade', () => {
    expect(cardPlayNeedsTarget('spy-thief', false)).toBe(true);
    expect(cardPlayNeedsTarget('spy-thief', true)).toBe(false);
    expect(cardPlayNeedsTarget('upgrade-point-thief', false)).toBe(true);
    expect(cardPlayNeedsTarget('upgrade-point-thief', true)).toBe(false);
  });
});

describe('elimination reward options (rules spec §6, L44-06)', () => {
  it('offers 4 lives, 8 points, 1 upgrade point or a card, and builds the card pick', () => {
    expect(REWARD_KINDS.map((kind) => REWARD_KIND_LABELS[kind])).toEqual(['4 lives', '8 points', '1 upgrade point', 'A card']);
    expect(REWARD_KIND_COSTS).toEqual({
      lives: { kind: 'lives', amount: 4 }, points: { kind: 'points', amount: 8 }, upgradePoint: { kind: 'upgradePoint', amount: 1 },
    });
    expect([buildRewardChoice('card', 'c-1'), buildRewardChoice('card', ''), buildRewardChoice('lives', '')])
      .toEqual([{ type: 'card', instanceId: 'c-1' }, null, { type: 'lives' }]);
  });
});
