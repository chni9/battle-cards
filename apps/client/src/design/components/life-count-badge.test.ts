/**
 * Compact life-count badge — L56-04 / L56-06.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('LifeCountBadge (L56-04)', () => {
  it('uses the life glyph and distinct spoken labels', () => {
    const source = readFileSync(join(dir, 'life-count-badge.tsx'), 'utf8');
    expect(source).toContain("getResourceIconUrl('life')");
    expect(source).toContain('damage');
    expect(source).toContain('card lives');
    expect(source).not.toContain("from './resource-icon'");
    expect(source).toContain('tabular-nums');
  });
});
