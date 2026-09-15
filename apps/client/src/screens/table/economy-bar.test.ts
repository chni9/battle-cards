/**
 * Economy bar Unspy chrome — L58-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('economy bar Unspy (L58-07)', () => {
  it('places Unspy next to Shop with crossed-eye and CLEAR_SPY_COST', () => {
    const source = readFileSync(join(dir, 'economy-bar.tsx'), 'utf8');
    const shopAt = source.indexOf('SHOP_ACTION_LABEL');
    const unspyAt = source.indexOf('UNSPY_ACTION_LABEL');
    expect(shopAt).toBeGreaterThan(-1);
    expect(unspyAt).toBeGreaterThan(shopAt);
    expect(source).toContain('SpyEyeIcon');
    expect(source).toContain("variant=\"crossed\"");
    expect(source).toContain('CLEAR_SPY_COST');
    expect(source).toContain("signed=\"cost\"");
    expect(source).toContain('data-unspy');
    expect(source).toContain('unspyDisabled');
    expect(source).toContain('hasLivingSpy');
    expect(source).toContain('canAffordUnspy');
    expect(source).not.toMatch(/\bUP\b/);
  });
});
