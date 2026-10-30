import { describe, expect, it } from 'vitest';

import { ADMIN_SECTIONS, adminRoute, adminSectionHref, normalizeAdminPath } from './admin-routes';

describe('admin routes (Lot 61-06, L80-01)', () => {
  it('routes /admin and /admin/dashboard to Overview and unknown paths fall back to it', () => {
    for (const path of ['/admin', '/admin/', '/admin/dashboard', '/admin/nope']) {
      expect(adminRoute(path), path).toStrictEqual({ page: 'dashboard', gameId: null, table: null });
    }
  });

  it('routes games, game detail, kits, feedback, data and data tables', () => {
    expect(adminRoute('/admin/games')).toStrictEqual({ page: 'games', gameId: null, table: null });
    expect(adminRoute('/admin/games/abc')).toStrictEqual({ page: 'games', gameId: 'abc', table: null });
    expect(adminRoute('/admin/kits')).toStrictEqual({ page: 'kits', gameId: null, table: null });
    expect(adminRoute('/admin/feedback')).toStrictEqual({ page: 'feedback', gameId: null, table: null });
    expect(adminRoute('/admin/data')).toStrictEqual({ page: 'data', gameId: null, table: null });
    expect(adminRoute('/admin/data/finished_games')).toStrictEqual({
      page: 'data',
      gameId: null,
      table: 'finished_games',
    });
  });

  it('strips one trailing slash and reads an empty path as /admin', () => {
    expect([normalizeAdminPath('/admin/kits/'), normalizeAdminPath('/admin'), normalizeAdminPath('')]).toStrictEqual([
      '/admin/kits',
      '/admin',
      '/admin',
    ]);
  });

  it('marks a section by exact path or, except Overview, by prefix (Appendix A admin-nav)', () => {
    expect(adminSectionHref('/admin')).toBe('/admin');
    expect(adminSectionHref('/admin/dashboard')).toBeNull();
    expect(adminSectionHref('/admin/games/abc')).toBe('/admin/games');
    expect(adminSectionHref('/admin/data/feedback_reports')).toBe('/admin/data');
    expect(adminSectionHref('/admin/kits/')).toBe('/admin/kits');
  });

  it('lists the five sections in order', () => {
    expect(ADMIN_SECTIONS.map((section) => section.label)).toStrictEqual([
      'Overview',
      'Matches',
      'Kits',
      'Feedback',
      'Database',
    ]);
    expect(ADMIN_SECTIONS.map((section) => section.href)).toStrictEqual([
      '/admin',
      '/admin/games',
      '/admin/kits',
      '/admin/feedback',
      '/admin/data',
    ]);
  });
});
