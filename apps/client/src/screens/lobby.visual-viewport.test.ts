/**
 * Full-bleed table — L53-07. html / #root / the shell fill the window.
 * Lobby part, split from design/components/visual-viewport.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('full-bleed viewport (L53-07)', () => {
  it('fills html / #root / the table with 100% instead of a stale 100dvh (lobby)', () => {
    const lobby = readFileSync(join(dir, 'lobby.tsx'), 'utf8');
    expect(lobby).not.toContain('100dvh');
  });
});
