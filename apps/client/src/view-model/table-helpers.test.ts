/**
 * Elimination reward options — rules spec §6.
 */

import { describe, expect, it } from 'vitest';

import { buildRewardChoice, REWARD_KIND_LABELS, REWARD_KINDS } from './table-helpers';

describe('elimination reward options (rules spec §6, L44-06)', () => {
  it('offers 4 lives, 8 points, 1 upgrade point or a card, and builds the card pick', () => {
    expect(REWARD_KINDS.map((kind) => REWARD_KIND_LABELS[kind])).toEqual(['4 lives', '8 points', '1 upgrade point', 'A card']);
    expect([buildRewardChoice('card', 'c-1'), buildRewardChoice('card', ''), buildRewardChoice('lives', '')])
      .toEqual([{ type: 'card', instanceId: 'c-1' }, null, { type: 'lives' }]);
  });
});
