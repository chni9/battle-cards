/**
 * Draw / Sell contrast and signed CostDisplay — designer 2026-08-21 follow-up.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

function source(name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

describe('table cost chrome contrast (designer 2026-08-21)', () => {
  it('draws and sells on green, not yellow-on-yellow or orange-on-life', () => {
    const economy = source('economy-bar.tsx');
    const shop = source('shop-dialog.tsx');
    const cardDialog = source('card-actions.tsx');

    expect(economy).toContain('variant="green"');
    expect(economy).toContain('signed="gain"');
    expect(economy).not.toContain('variant="yellow"');

    expect(shop).toContain('SELL_UPGRADE_POINT_LABEL');
    expect(shop).toMatch(/variant="green"[\s\S]*SELL_UPGRADE_POINT_LABEL|SELL_UPGRADE_POINT_LABEL[\s\S]*signed="gain"/);
    expect(shop).toContain('signed="cost"');
    expect(shop).toContain('signed="gain"');

    expect(cardDialog).toContain('signed="cost"');
    expect(cardDialog).toContain('signed="gain"');
    expect(cardDialog).toMatch(/CARD_SELL_LABEL[\s\S]*signed="gain"|signed="gain"[\s\S]*CARD_SELL_LABEL/);
    expect(cardDialog).toMatch(/variant="green"[\s\S]*CARD_SELL_LABEL|CARD_SELL_LABEL[\s\S]*variant="green"/);
  });
});
