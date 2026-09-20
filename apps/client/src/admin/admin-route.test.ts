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
    expect(games).toContain('onOpen(row.id)');
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

  it('ignores stale Matches, Kits, and Database list fetches', () => {
    const games = read('screens/admin/admin-games-page.tsx');
    const kits = read('screens/admin/admin-kits-page.tsx');
    const data = read('screens/admin/admin-data-page.tsx');
    expect(games.match(/let cancelled = false/g)).toHaveLength(2);
    expect(games).toContain('loadedKey === listKey');
    expect(games).toContain('setPage(null)');
    expect(kits).toContain('let cancelled = false');
    expect(kits).toContain('if (cancelled)');
    expect(kits).toContain('visibleStats');
    expect(kits).toContain('setStats(null)');
    expect(data).toContain('let cancelled = false');
    expect(data).toContain('if (cancelled)');
    expect(data).toContain('loadedTable === activeTable');
    expect(data).toContain('setPage(null)');
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
    expect(dashboard).toContain('Loading…');
    expect(dashboard).toContain('overviewQuery(applied, actors)');
    expect(dashboard).toContain('exportOverviewXlsx');
    expect(dashboard).not.toContain('setOverview(null)');
  });

  it('renders nine Overview modules and an Actors control', () => {
    const modules = read('screens/admin/admin-overview-modules.tsx');
    expect(modules).toContain('title="General"');
    expect(modules).toContain('title="Volume"');
    expect(modules).toContain('title="Gameplay"');
    expect(modules).toContain('title="Economy"');
    expect(modules).toContain('title="Combat"');
    expect(modules).toContain('title="Hidden tools"');
    expect(modules).toContain('title="Bots and seats"');
    expect(modules).toContain('title="Endings"');
    expect(modules).toContain('title="Retention and feedback"');
    expect(modules).toContain('AdminActorsControl');
    expect(modules).toContain('Hours are UTC.');
    expect(modules).toContain('Tax and Suicide life loss is not attack damage.');
    expect(modules).toContain('Ignores the opponents match-mix filter');
    expect(modules).toContain('AdminScatterChart');
    expect(modules).toContain('New matches only');
  });
});
