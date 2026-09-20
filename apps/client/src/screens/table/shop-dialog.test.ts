/**
 * Shop buy cells use shared choice chrome — L44-01.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('shop buy cells (L44-01 / L58-03)', () => {
  it('uses choiceTileClassName and keeps Buy / double-click / CostDisplay', () => {
    const source = readFileSync(join(dir, 'shop-dialog.tsx'), 'utf8');
    expect(source).toContain('choiceTileClassName');
    expect(source).toContain('onDoubleClick');
    expect(source).toContain('CostDisplay');
    expect(source).toContain('CARD_BUY_LABEL');
    expect(source).toContain('pt-12');
    expect(source).toContain('scrollIntoView');
  });

  it('puts an upgrade-point icon on the title and ±1 on Buy/Sell (L58-03)', () => {
    const source = readFileSync(join(dir, 'shop-dialog.tsx'), 'utf8');
    const balanceAt = source.indexOf('data-shop-upgrade-balance');
    const actionsAt = source.indexOf('data-shop-upgrade-actions');
    expect(balanceAt).toBeGreaterThan(-1);
    expect(actionsAt).toBeGreaterThan(balanceAt);
    expect(source.slice(balanceAt, actionsAt)).toContain("getResourceIconUrl('upgradePoint')");
    expect(source.slice(balanceAt, actionsAt)).not.toContain('view.self.upgradePoints');
    expect(source).not.toMatch(/\bResourceIcon\b/);
    const buyBlock = source.indexOf('amount: buyUpgradeCost');
    const sellBlock = source.indexOf('amount: sellUpgradeYield');
    expect(buyBlock).toBeGreaterThan(-1);
    expect(sellBlock).toBeGreaterThan(buyBlock);
    expect(source.slice(buyBlock, sellBlock)).toContain("kind: 'upgradePoint'");
    expect(source.slice(buyBlock, sellBlock)).toContain('signed="gain"');
    expect(source.slice(sellBlock, sellBlock + 450)).toContain("kind: 'upgradePoint'");
    expect(source.slice(sellBlock, sellBlock + 450)).toContain('signed="cost"');
    expect(source).toContain('highlightId="shop-upgrade-point"');
    expect(source).not.toMatch(/\bUP\b/);
  });

  it('shows Buy random with the public pool fee (L58-05)', () => {
    const source = readFileSync(join(dir, 'shop-dialog.tsx'), 'utf8');
    const poolAt = source.indexOf('data-shop-pool-buy');
    expect(poolAt).toBeGreaterThan(-1);
    expect(source).toContain('BUY_POOL_CARD_LABEL');
    expect(source).toContain('view.poolBuyCost');
    expect(source.slice(poolAt, poolAt + 400)).toContain("kind: 'points'");
    expect(source).toContain('onBuyPoolCard');
  });

  it('renders fogged pool slots without card identity (L63-06)', () => {
    const source = readFileSync(join(dir, 'shop-dialog.tsx'), 'utf8');
    expect(source).toContain('poolCardHasIdentity');
    expect(source).toContain('HIDDEN_CARD_CAPTION');
  });
});
