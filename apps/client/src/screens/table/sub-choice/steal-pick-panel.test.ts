/**
 * Steal-pick visual picker — L44-05 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('StealPickPanel (L44-05)', () => {
  it('uses CardChoiceTile; hidden cards stay nameless with no instance id', () => {
    const source = readFileSync(join(dir, 'steal-pick-panel.tsx'), 'utf8');
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('HIDDEN_CARD_CAPTION');
    expect(source).toContain("kind: 'steal-pick'");
    expect(source).toContain('instanceId: resolvedSelectedId');
    expect(source).not.toContain('instanceId.slice');
    expect(source).not.toContain('getOpponentPlaceholderUrl');
    expect(source).not.toContain('<select');
  });
});
