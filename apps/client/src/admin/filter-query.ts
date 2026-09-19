/**
 * Shared admin filter query params for dashboard, games, and kits.
 */

import type { AdminActorsFilter } from '@card-battle/shared';

export interface AdminFilterState {
  from: string;
  to: string;
  bots: 'all' | 'humans' | 'withBots';
  occupancy: string;
  kit: string;
  includeTutorial: boolean;
}

export const DEFAULT_ADMIN_FILTERS: AdminFilterState = {
  from: '',
  to: '',
  bots: 'all',
  occupancy: '',
  kit: '',
  includeTutorial: false,
};

/**
 * `datetime-local` has no offset. Convert the designer's local clock to UTC
 * ISO so the VPS (`new Date` in UTC) does not shift the window.
 */
export function localDateTimeToUtcIso(value: string): string | undefined {
  if (value.length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

export function filtersToQuery(filters: AdminFilterState): Record<string, string> {
  const query: Record<string, string> = {};
  const fromIso = localDateTimeToUtcIso(filters.from);
  if (fromIso !== undefined) {
    query['from'] = fromIso;
  }
  const toIso = localDateTimeToUtcIso(filters.to);
  if (toIso !== undefined) {
    query['to'] = toIso;
  }
  if (filters.bots !== 'all') {
    query['bots'] = filters.bots;
  }
  if (filters.occupancy.length > 0) {
    query['occupancy'] = filters.occupancy;
  }
  if (filters.kit.length > 0) {
    query['kit'] = filters.kit;
  }
  if (filters.includeTutorial) {
    query['includeTutorial'] = 'true';
  }
  return query;
}

/** Overview-only: `actors` is seat/action grain, not match mix. */
export function overviewQuery(
  filters: AdminFilterState,
  actors: AdminActorsFilter,
): Record<string, string> {
  const query = filtersToQuery(filters);
  if (actors !== 'both') {
    query['actors'] = actors;
  }
  return query;
}
