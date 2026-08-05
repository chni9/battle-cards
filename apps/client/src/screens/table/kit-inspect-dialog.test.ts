/**
 * Kit inspect special-card keys — backlog L27-05.
 */

import { describe, expect, it } from 'vitest';

import { getKit } from '@card-battle/shared';

import { kitSpecialCardKey } from './kit-special-card-key';

describe('kitSpecialCardKey (L27-05)', () => {
  it('disambiguates duplicate special card ids for Specialist', () => {
    const keys = getKit('specialist').specialCards.map((cardId, index) =>
      kitSpecialCardKey(cardId, index),
    );
    expect(keys).toEqual([
      'card-transformer:0',
      'card-transformer:1',
      'card-thief:2',
      'super-absorber:3',
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
