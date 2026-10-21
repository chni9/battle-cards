/**
 * Economy / shop chrome labels — L43-02 / technical spec v6 §6.1.
 * Economy-bar part, split from screens/table/chrome-labels.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

function source(name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

describe('economy chrome labels (L43-02)', () => {
  it('keeps UP off economy-bar, shop, and card-dialog chrome source', () => {
    const economy = source('economy-bar.tsx');
    const shop = source('shop-dialog.tsx');
    const cardDialog = source('card-actions.tsx');

    expect(economy).not.toMatch(/\bUP\b/);
    expect(shop).not.toMatch(/\bUP\b/);
    expect(cardDialog).not.toMatch(/\bUP\b/);
    expect(economy).toContain('DRAW_ACTION_LABEL');
    expect(economy).toContain('SHOP_ACTION_LABEL');
    expect(economy).toContain('UNSPY_ACTION_LABEL');
    expect(economy).toContain('aria-label={drawLabel}');
    expect(economy).toContain('aria-label={unspyLabel}');
    expect(economy).not.toMatch(/\{DRAW_ACTION_LABEL\}\s*\{' '\}/);
    expect(economy).not.toMatch(/\{UNSPY_ACTION_LABEL\}\s*\{' '\}/);
    expect(economy).toContain("kind: 'points'");
    expect(economy).not.toContain('How to play');
    expect(economy).not.toContain('onLeave');
    expect(shop).toContain('upgradePointBuyCost');
    expect(shop).toContain('upgradePointSellYield');
    expect(cardDialog).toContain("kind: 'upgradePoint'");
    expect(cardDialog).toContain('sellYield');
  });
});
