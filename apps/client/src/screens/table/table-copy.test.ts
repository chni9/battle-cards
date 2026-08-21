/**
 * Table readability copy — technical spec v6 §6.1 / L43-03.
 */

import { describe, expect, it } from 'vitest';

import { FELT_QUEUE_TITLE, HIDDEN_KIT_LABEL, SHOP_PRICE_BLURB } from './table-copy';

describe('table copy (L43-03 / technical spec v6 §6.1)', () => {
  it('uses Hidden kit, Waiting on others, and double the play cost', () => {
    expect(HIDDEN_KIT_LABEL).toBe('Hidden kit');
    expect(FELT_QUEUE_TITLE).toBe('Waiting on others');
    expect(SHOP_PRICE_BLURB).toContain('double the play cost');
    expect(SHOP_PRICE_BLURB).not.toContain('base play cost');
    expect(SHOP_PRICE_BLURB).not.toMatch(/\bUP\b/);
  });
});
