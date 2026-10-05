import { describe, expect, it } from 'vitest';

import { spiedRevealsCards } from './visibility';

describe('spiedRevealsCards (Lot 69)', () => {
  it('is false for base Spy live resources only', () => {
    expect(spiedRevealsCards({})).toBe(false);
  });

  it('is true when Spy+ exposes hand or special lists', () => {
    expect(spiedRevealsCards({ hand: [], specialCards: [] })).toBe(true);
    expect(spiedRevealsCards({ hand: [] })).toBe(true);
    expect(spiedRevealsCards({ specialCards: [] })).toBe(true);
  });
});
