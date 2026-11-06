/**
 * Moved verbatim from `screens/table/kit-inspect-dialog.test.ts` (technical spec v7 §12.2; L75-11).
 */
import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

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
