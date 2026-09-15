/**
 * Spy eye on opponent seats — L58-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('opponent spy eye (L58-07)', () => {
  it('shows an open eye when spyingOnYou is set', () => {
    const source = readFileSync(join(dir, 'opponent-zone.tsx'), 'utf8');
    expect(source).toContain('data-spy-eye');
    expect(source).toContain('spyingOnYou');
    expect(source).toContain("variant=\"open\"");
    expect(source).not.toContain('variant="crossed"');
  });
});
