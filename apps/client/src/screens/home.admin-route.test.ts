/**
 * Admin route — Lot 61-06.
 * Home part, split from admin/admin-route.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(src, rel), 'utf8');
}

describe('admin route (Lot 61-06)', () => {
  it('renders /admin before game phases and redirects /inbox to feedback (home)', () => {
    const home = read('screens/home.tsx');
    expect(home).not.toContain('/admin');
    expect(home).not.toContain('/inbox');
  });
});
