/**
 * Card inspect Cost label — L51-12.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('CardEffectCopy (L51-12)', () => {
  it('labels play cost Cost and renders effect text through resource glyphs', () => {
    const source = readFileSync(join(dir, 'card-effect-copy.tsx'), 'utf8');
    expect(source).toContain('<span>Cost</span>');
    expect(source).toContain('EffectTextWithIcons');
    expect(source).not.toContain('Choose Use, Upgrade, or Sell.');
    expect(source).not.toContain('Cost:');
  });
});
