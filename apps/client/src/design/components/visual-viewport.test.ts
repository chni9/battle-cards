/**
 * Full-bleed table — L53-07. html / #root / the shell fill the window.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('full-bleed viewport (L53-07)', () => {
  it('fills html / #root / the table with 100% instead of a stale 100dvh', () => {
    const css = readFileSync(join(dir, '../../index.css'), 'utf8');
    expect(css).toContain('overflow: hidden');
    const root = css.slice(css.indexOf('#root {'), css.indexOf('#root {') + 220);
    expect(root).toContain('width: 100%');
    expect(root).toContain('height: 100%');
    expect(root).not.toContain('100dvh');
    const shell = readFileSync(
      join(dir, '../../screens/table/table-shell.tsx'),
      'utf8',
    );
    expect(shell).toContain('h-full max-h-full w-full');
    expect(shell).not.toContain('100dvh');
    expect(shell).not.toContain('w-screen');
    const home = readFileSync(join(dir, '../../screens/home.tsx'), 'utf8');
    expect(home).not.toContain('100dvh');
    const lobby = readFileSync(join(dir, '../../screens/lobby.tsx'), 'utf8');
    expect(lobby).not.toContain('100dvh');
  });
});
