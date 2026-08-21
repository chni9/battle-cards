/**
 * Economy / shop chrome labels — L43-02 / technical spec v6 §6.1.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CHROME_COST_LABELS } from './chrome-labels';

const dir = dirname(fileURLToPath(import.meta.url));

function source(name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

describe('economy chrome labels (L43-02)', () => {
  it('does not use the UP token on chrome labels', () => {
    for (const label of CHROME_COST_LABELS) {
      expect(label).not.toMatch(/\bUP\b/);
    }
  });

  it('keeps UP off economy-bar, shop, and card-dialog chrome source', () => {
    const economy = source('economy-bar.tsx');
    const shop = source('shop-dialog.tsx');
    const cardDialog = source('card-actions.tsx');

    expect(economy).not.toMatch(/\bUP\b/);
    expect(shop).not.toMatch(/\bUP\b/);
    expect(cardDialog).not.toMatch(/\bUP\b/);
    expect(economy).toContain('DRAW_ACTION_LABEL');
    expect(economy).toContain('SHOP_ACTION_LABEL');
    expect(economy).toContain("kind: 'points'");
    expect(shop).toContain('upgradePointBuyCost');
    expect(shop).toContain('upgradePointSellYield');
    expect(cardDialog).toContain("kind: 'upgradePoint'");
    expect(cardDialog).toContain('sellYield');
  });
});
