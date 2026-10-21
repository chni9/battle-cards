/**
 * Full-bleed table — L53-07. html / #root / the shell fill the window.
 * Index part, split from design/components/visual-viewport.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('full-bleed viewport (L53-07)', () => {
  it('fills html / #root / the table with 100% instead of a stale 100dvh (index)', () => {
    const css = readFileSync(join(dir, 'index.css'), 'utf8');
    expect(css).toContain('overflow: hidden');
    const root = css.slice(css.indexOf('#root {'), css.indexOf('#root {') + 220);
    expect(root).toContain('width: 100%');
    expect(root).toContain('height: 100%');
    expect(root).not.toContain('100dvh');
  });
});
