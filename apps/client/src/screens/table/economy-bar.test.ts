/**
 * Economy bar Unspy chrome — L58-07 / compact Draw + Unspy — L59-01.
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

describe('economy bar compact Draw / Shop / Unspy (L59-01 / L59-02)', () => {
  it('omits Draw and Unspy words from the button face', () => {
    const source = readFileSync(join(dir, 'economy-bar.tsx'), 'utf8');
    expect(source).not.toMatch(/\{DRAW_ACTION_LABEL\}\s*\{' '\}/);
    expect(source).not.toMatch(/\{UNSPY_ACTION_LABEL\}\s*\{' '\}/);
    expect(source).toContain('aria-label={drawLabel}');
    expect(source).toContain('aria-label={unspyLabel}');
    expect(source).toContain('costAriaLabel(drawCost, \'gain\')');
    expect(source).toContain('costAriaLabel(unspyCost, \'cost\')');
    expect(source).toContain('signed="gain"');
    expect(source).toContain("variant=\"crossed\"");
    expect(source).toContain('variant={drawVariant}');
    expect(source).toMatch(/variant="orange"[\s\S]{0,80}compact/);
    expect(source).toMatch(/variant="purple"[\s\S]{0,80}compact/);
    expect(source).toContain('{SHOP_ACTION_LABEL}');
    expect(source).toContain('title={drawLabel}');
    expect(source).toContain('title={unspyLabel}');
    expect(source).toContain('title={null}');
  });
});

describe('economy bar Gambler Draw payout (L64-05)', () => {
  it('uses red when drawValue is above 10 and pulses on change', () => {
    const source = readFileSync(join(dir, 'economy-bar.tsx'), 'utf8');
    expect(source).toContain('drawValue > 10');
    expect(source).toContain('variant={drawVariant}');
    expect(source).toContain("'red'");
    expect(source).toContain('motion');
    expect(source).toContain('scale');
    expect(source).toContain('isMyTurn');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('aria-label={drawLabel}');
    expect(source).not.toMatch(/\{DRAW_ACTION_LABEL\}\s*\{' '\}/);
  });

  it('table passes public drawGain when present', () => {
    const table = readFileSync(join(dir, '../table.tsx'), 'utf8');
    expect(table).toContain('drawGain');
    expect(table).toContain('startingResources.draw');
    expect(table).toContain('drawValue={drawValue}');
  });
});
