/**
 * Prophet ability copy: technical spec v7 §10.1 (Lot 76 row), L76-03. Mirrors the one line edited in
 * `screens/table/kit-inspect-dialog.test.ts`, which Lot 75 deletes (Lot 76 plan, Appendix A.9 ruling 2).
 */
import { CIRCULATING_SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { KIT_ABILITY_COPY } from './kit-inspect-traits';

describe('Prophet ability copy (spec v7 §10.1, L76-03)', () => {
  it('says Prophet starts with 2 random circulating specials, duplicates allowed', () => {
    expect(KIT_ABILITY_COPY.prophet).toMatch(/2 special/i);
    expect(KIT_ABILITY_COPY.prophet).toBe('Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).');
  });

  it('names no excluded special while every special circulates (Invisibility is live again, L58-06)', () => {
    expect(CIRCULATING_SPECIAL_CARD_IDS).toContain('invisibility');
    expect(KIT_ABILITY_COPY.prophet).not.toMatch(/excluded/i);
  });
});
