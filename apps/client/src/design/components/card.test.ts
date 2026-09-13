/**
 * Card face inspect copy — L51-05.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('Card detail=full (L51-05)', () => {
  it('renders CostDisplay via CardEffectCopy, not Cost: prose', () => {
    const source = readFileSync(join(dir, 'card.tsx'), 'utf8');
    expect(source).toContain('CardEffectCopy');
    expect(source).not.toContain('formatCardEffectText');
    expect(source).not.toContain('Cost:');
  });

  it('overlays listed attack damage without ResourceIcon (L56-04)', () => {
    const source = readFileSync(join(dir, 'card.tsx'), 'utf8');
    expect(source).toContain('listedAttackDamage');
    expect(source).toContain('LifeCountBadge');
    expect(source).toContain("kind=\"damage\"");
    expect(source).not.toContain('ResourceIcon');
  });
});
