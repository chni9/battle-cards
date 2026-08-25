/**
 * Special-pick visual picker — L44-05 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('SpecialPickPanel (L44-05)', () => {
  it('uses CardChoiceTile and still sends cardId', () => {
    const source = readFileSync(join(dir, 'special-pick-panel.tsx'), 'utf8');
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain("kind: 'special-pick'");
    expect(source).toContain('cardId: resolvedSelectedId');
    expect(source).not.toContain('<select');
  });
});
