/**
 * `/admin` routing (Lot 61-06), pure so it is tested without a DOM (L80-01). The shell and the
 * nav read the same rules from here: Appendix A `admin-nav` (five sections, exact-or-prefix
 * highlight) and the deep links `/admin/games/:id` and `/admin/data/:table`.
 */

export type AdminPage = 'dashboard' | 'games' | 'kits' | 'feedback' | 'data';

export interface AdminRoute {
  page: AdminPage;
  /** `finished_games.id` of an open match detail (L62-07): `room_id` repeats on Play again. */
  gameId: string | null;
  table: string | null;
}

export interface AdminLink {
  href: string;
  label: string;
}

const ADMIN_ROOT = '/admin';
const GAMES_PREFIX = '/admin/games/';
const DATA_PREFIX = '/admin/data/';

/** Strips one trailing `/`; an empty result reads as `/admin`. */
export function normalizeAdminPath(pathname: string): string {
  return pathname.replace(/\/$/, '') || ADMIN_ROOT;
}

function route(page: AdminPage, gameId: string | null = null, table: string | null = null): AdminRoute {
  return { page, gameId, table };
}

/** Any path the five sections do not claim falls back to Overview, as in L61-06. */
export function adminRoute(pathname: string): AdminRoute {
  const path = normalizeAdminPath(pathname);
  if (path.startsWith(GAMES_PREFIX)) return route('games', path.slice(GAMES_PREFIX.length));
  if (path.startsWith(DATA_PREFIX)) return route('data', null, path.slice(DATA_PREFIX.length));
  switch (path) {
    case '/admin/games':
      return route('games');
    case '/admin/kits':
      return route('kits');
    case '/admin/feedback':
      return route('feedback');
    case '/admin/data':
      return route('data');
    default:
      return route('dashboard');
  }
}

export const ADMIN_SECTIONS: readonly AdminLink[] = [
  { href: ADMIN_ROOT, label: 'Overview' },
  { href: '/admin/games', label: 'Matches' },
  { href: '/admin/kits', label: 'Kits' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/data', label: 'Database' },
];

/**
 * The section to mark current: exact match, or a path under a section other than Overview
 * (L61-06 rule). The prefix ends at a `/`, so `/admin/gamesx` marks nothing. `/admin/dashboard`
 * routes to Overview but marks no section, as before (Appendix A `admin-nav`).
 */
export function adminSectionHref(pathname: string): string | null {
  const path = normalizeAdminPath(pathname);
  const section = ADMIN_SECTIONS.find(
    ({ href }) => path === href || (href !== ADMIN_ROOT && path.startsWith(`${href}/`)),
  );
  return section?.href ?? null;
}
