/**
 * Token flyout overlay chrome — L51-14.
 * Table-fx-overlay part, split from fx/play-flyout.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('measureTokenFlyout playerId (L51-09 / L51-13)', () => {
  it('token chip chrome is asCard-only — width must not promote resource icons (L51-14) (table-fx-overlay)', () => {
    const overlay = readFileSync(join(dir, 'table-fx-overlay.tsx'), 'utf8');
    expect(overlay).toContain('tokenFlyoutUsesCardChrome');
    expect(overlay).toContain('0.88');
    expect(overlay).not.toMatch(/from\.width\s*>=\s*40/);
    expect(overlay).not.toMatch(/from\.width\s*>=\s*64/);
  });
});
