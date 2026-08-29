/**
 * Catalog effect copy resource glyphs — L51-12.
 */

import { describe, expect, it } from 'vitest';

import { SHARED_CARD_CATALOG } from '@card-battle/shared';

import { tokenizeEffectResources } from './effect-text-tokens';

describe('tokenizeEffectResources (L51-12)', () => {
  it('turns Regeneration amounts into life and point spans, including instead-of', () => {
    const regen = SHARED_CARD_CATALOG.regeneration;
    expect(tokenizeEffectResources(regen.effect)).toEqual([
      { start: 10, end: 17, amount: 4, kind: 'life', insteadOf: false },
      { start: 21, end: 29, amount: 3, kind: 'point', insteadOf: false },
    ]);
    expect(tokenizeEffectResources(regen.upgradeAdds)).toEqual([
      { start: 11, end: 19, amount: 2, kind: 'point', insteadOf: false },
      { start: 25, end: 37, amount: 3, kind: 'point', insteadOf: true },
    ]);
  });

  it('does not treat damage numbers as resource icons', () => {
    expect(tokenizeEffectResources('Deal 3 damage to an opponent.')).toEqual([]);
    expect(tokenizeEffectResources('Deal 3 damage instead of 1.')).toEqual([]);
  });

  it('matches upgrade points before points', () => {
    expect(tokenizeEffectResources('Also gain 10 points, 2 upgrade points, and 4 lives.')).toEqual([
      { start: 10, end: 19, amount: 10, kind: 'point', insteadOf: false },
      { start: 21, end: 37, amount: 2, kind: 'upgradePoint', insteadOf: false },
      { start: 43, end: 50, amount: 4, kind: 'life', insteadOf: false },
    ]);
  });
});
