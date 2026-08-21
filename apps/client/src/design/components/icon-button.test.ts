/**
 * Compact IconButton — L43-05. 44px target, no Button min-width.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('IconButton (L43-05)', () => {
  it('uses a 44px target without Button min-width', () => {
    const source = readFileSync(join(dir, 'icon-button.tsx'), 'utf8');
    expect(source).toContain("'inline-flex h-11 w-11 shrink-0 items-center justify-center'");
    expect(source).not.toMatch(/className=\[[\s\S]*min-w-\[7rem\]/);
  });
});
