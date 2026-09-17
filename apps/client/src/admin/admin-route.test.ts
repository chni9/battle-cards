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
    const home = read('screens/home.tsx');
    expect(app).toContain("path.startsWith('/admin/')");
    expect(app).toContain("window.location.replace('/admin/feedback')");
    expect(app).toContain('<AdminApp');
    expect(home).not.toContain('/admin');
    expect(home).not.toContain('/inbox');
  });

  it('reuses inbox password session storage', () => {
    const admin = read('screens/admin/admin-app.tsx');
    const fetchAdmin = read('admin/fetch-admin.ts');
    expect(admin).toContain('readStoredInboxPassword');
    expect(fetchAdmin).toContain('X-Inbox-Password');
  });

  it('keys game detail by finished-game id and can close a URL dialog', () => {
    const games = read('screens/admin/admin-games-page.tsx');
    expect(games).toContain('openDetail(row.id)');
    expect(games).toContain('ignoreUrlDetail');
    expect(games).toContain("replaceState({}, '', gamesListPath())");
    expect(games).not.toContain('setPickedDetail(row.roomId)');
  });

  it('ignores stale game-detail responses and surfaces 404/503', () => {
    const games = read('screens/admin/admin-games-page.tsx');
    expect(games).toContain('let cancelled = false');
    expect(games).toContain('if (cancelled)');
    expect(games).toContain('setDetailError(adminErrorCopy(result.status))');
  });

  it('re-opens the password gate on 401', () => {
    const admin = read('screens/admin/admin-app.tsx');
    const fetchAdmin = read('admin/fetch-admin.ts');
    const gate = read('screens/admin/admin-password-gate.tsx');
    expect(fetchAdmin).toContain('lockAdminSession');
    expect(admin).toContain('subscribeAdminUnauthorized');
    expect(admin).toContain('setPassword(null)');
    expect(gate).toContain('.finally(');
    expect(gate).toContain('adminErrorCopy(0)');
  });

  it('clears dashboard error after a successful overview fetch', () => {
    const dashboard = read('screens/admin/admin-dashboard-page.tsx');
    expect(dashboard).toContain('setOverview(result.data)');
    expect(dashboard).toContain('setError(null)');
  });
});
