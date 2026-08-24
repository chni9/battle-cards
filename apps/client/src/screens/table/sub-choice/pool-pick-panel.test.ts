/**
 * Pool-pick visual picker — L44-05 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('PoolPickPanel (L44-05)', () => {
  it('uses CardChoiceTile and disables extras at maxCount', () => {
    const source = readFileSync(join(dir, 'pool-pick-panel.tsx'), 'utf8');
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('disabled={atCap}');
    expect(source).toContain('subChoice.maxCount');
    expect(source).toContain("kind: 'pool-pick'");
    expect(source).toContain('instanceIds: selectedIds');
    expect(source).not.toContain('<select');
    expect(source).not.toMatch(/type="checkbox"/);
  });
});
