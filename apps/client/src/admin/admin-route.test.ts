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
  it('renders /admin before game phases and redirects /inbox to feedback', () => {
    const app = read('App.tsx');
    expect(app).toContain("path.startsWith('/admin/')");
    expect(app).toContain("window.location.replace('/admin/feedback')");
    expect(app).toContain('<AdminApp');
  });

  it('ignores stale game-detail responses and surfaces 404/503', () => {
    const games = read('screens/admin/admin-games-page.tsx');
    expect(games).toContain('let cancelled = false');
    expect(games).toContain('if (cancelled)');
    expect(games).toContain('setDetailError(adminErrorCopy(result.status))');
  });

  it('ignores stale Matches, Kits, and Database list fetches', () => {
    const kits = read('screens/admin/admin-kits-page.tsx');
    const data = read('screens/admin/admin-data-page.tsx');
    expect(kits).toContain('let cancelled = false');
    expect(kits).toContain('if (cancelled)');
    expect(kits).toContain('visibleStats');
    expect(kits).toContain('setStats(null)');
    expect(data).toContain('let cancelled = false');
    expect(data).toContain('if (cancelled)');
    expect(data).toContain('loadedTable === activeTable');
    expect(data).toContain('setPage(null)');
  });
});
