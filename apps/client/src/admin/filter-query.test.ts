import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  localDateTimeToUtcIso,
} from './filter-query';

describe('filtersToQuery (Lot 62 Bugbot)', () => {
  it('omits empty From/To', () => {
    expect(filtersToQuery(DEFAULT_ADMIN_FILTERS)).toEqual({});
  });

  it('sends From/To as UTC ISO from the local datetime-local value', () => {
    const local = '2026-09-18T09:00';
    const iso = localDateTimeToUtcIso(local);
    expect(iso).toBeDefined();
    expect(iso).toBe(new Date(local).toISOString());
    expect(iso?.endsWith('Z')).toBe(true);

    const query = filtersToQuery({ ...DEFAULT_ADMIN_FILTERS, from: local, to: local });
    expect(query['from']).toBe(iso);
    expect(query['to']).toBe(iso);
  });

  it('drops invalid From/To instead of sending them naive', () => {
    const query = filtersToQuery({
      ...DEFAULT_ADMIN_FILTERS,
      from: 'not-a-date',
      to: 'also-bad',
    });
    expect(query['from']).toBeUndefined();
    expect(query['to']).toBeUndefined();
  });
});
