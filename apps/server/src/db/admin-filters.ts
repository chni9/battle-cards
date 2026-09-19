/**
 * Shared finished-game filters for admin SQL (Lot 61 / db.md tutorial exclusion).
 */

import type { AdminActorsFilter, KitId } from '@card-battle/shared';

export type AdminBotsFilter = 'all' | 'humans' | 'withBots';
export type { AdminActorsFilter };

export interface AdminFinishedGameFilters {
  /** When true, only non-tutorial rows (default for dashboard/kits). */
  excludeTutorial: boolean;
  endedFrom?: Date;
  endedTo?: Date;
  bots: AdminBotsFilter;
  /** Seat / action grain (Lot 62). Match mix (`bots`) still selects games. */
  actors: AdminActorsFilter;
  occupancy?: number;
  kitId?: KitId;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export function parseAdminBotsFilter(raw: string | undefined): AdminBotsFilter {
  if (raw === 'humans' || raw === 'withBots') {
    return raw;
  }
  return 'all';
}

export function parseAdminActorsFilter(raw: string | undefined): AdminActorsFilter {
  if (raw === 'humans' || raw === 'bots') {
    return raw;
  }
  return 'both';
}

/** Extra AND on a `finished_game_players` alias. Empty when `actors=both`. */
export function actorSeatAnd(alias: string, actors: AdminActorsFilter): string {
  if (actors === 'humans') {
    return ` AND ${alias}.is_bot = false`;
  }
  if (actors === 'bots') {
    return ` AND ${alias}.is_bot = true`;
  }
  return '';
}

export function parseAdminPagination(
  pageRaw: string | undefined,
  pageSizeRaw: string | undefined,
): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  let pageSize = Number.parseInt(pageSizeRaw ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/**
 * Admin From/To instants. Offset / `Z` strings keep their zone. Naive
 * `datetime-local` (`YYYY-MM-DDTHH:mm`) is UTC so a raw API call matches
 * Volume's UTC labels. The SPA converts the designer's local clock to ISO
 * before sending (`filter-query.ts`).
 */
export function parseAdminDate(raw: string): Date | undefined {
  if (raw.length === 0) {
    return undefined;
  }
  const naiveLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw);
  const parsed = new Date(naiveLocal ? `${raw}Z` : raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

export function parseAdminFinishedGameFilters(query: Record<string, unknown>): AdminFinishedGameFilters {
  const includeTutorial = query['includeTutorial'] === 'true' || query['includeTutorial'] === '1';
  const endedFromRaw = query['from'];
  const endedToRaw = query['to'];
  const occupancyRaw = query['occupancy'];
  const kitRaw = query['kit'];

  const endedFrom =
    typeof endedFromRaw === 'string' ? parseAdminDate(endedFromRaw) : undefined;
  const endedTo = typeof endedToRaw === 'string' ? parseAdminDate(endedToRaw) : undefined;

  let occupancy: number | undefined;
  if (typeof occupancyRaw === 'string' && occupancyRaw.length > 0) {
    const n = Number.parseInt(occupancyRaw, 10);
    if (Number.isInteger(n) && n >= 2 && n <= 8) {
      occupancy = n;
    }
  }

  let kitId: KitId | undefined;
  if (typeof kitRaw === 'string' && kitRaw.length > 0) {
    kitId = kitRaw as KitId;
  }

  const filters: AdminFinishedGameFilters = {
    excludeTutorial: !includeTutorial,
    bots: parseAdminBotsFilter(
      typeof query['bots'] === 'string' ? query['bots'] : undefined,
    ),
    actors: parseAdminActorsFilter(
      typeof query['actors'] === 'string' ? query['actors'] : undefined,
    ),
  };
  if (endedFrom !== undefined) {
    filters.endedFrom = endedFrom;
  }
  if (endedTo !== undefined) {
    filters.endedTo = endedTo;
  }
  if (occupancy !== undefined) {
    filters.occupancy = occupancy;
  }
  if (kitId !== undefined) {
    filters.kitId = kitId;
  }
  return filters;
}

export interface AdminFilterSql {
  whereSql: string;
  params: unknown[];
}

/**
 * Builds a WHERE fragment (including leading `WHERE`) for `finished_games g`.
 * Optional kit join uses alias `gp_kit`.
 */
export function buildFinishedGamesWhere(filters: AdminFinishedGameFilters): AdminFilterSql {
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (filters.excludeTutorial) {
    clauses.push('g.is_tutorial = false');
  }

  if (filters.endedFrom !== undefined) {
    params.push(filters.endedFrom.toISOString());
    clauses.push(`g.ended_at >= $${String(params.length)}`);
  }

  if (filters.endedTo !== undefined) {
    params.push(filters.endedTo.toISOString());
    clauses.push(`g.ended_at <= $${String(params.length)}`);
  }

  if (filters.bots === 'humans') {
    clauses.push('g.has_bots = false');
  } else if (filters.bots === 'withBots') {
    clauses.push('g.has_bots = true');
  }

  if (filters.occupancy !== undefined) {
    params.push(filters.occupancy);
    clauses.push(
      `(SELECT COUNT(*)::int FROM finished_game_players ocp WHERE ocp.game_id = g.id) = $${String(params.length)}`,
    );
  }

  if (filters.kitId !== undefined) {
    params.push(filters.kitId);
    clauses.push(
      `EXISTS (SELECT 1 FROM finished_game_players gp_kit WHERE gp_kit.game_id = g.id AND gp_kit.kit_id = $${String(params.length)})`,
    );
  }

  return {
    whereSql: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}
