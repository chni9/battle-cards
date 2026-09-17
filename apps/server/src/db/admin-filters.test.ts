import { describe, expect, it } from 'vitest';

import { buildFinishedGamesWhere, parseAdminFinishedGameFilters } from './admin-filters';

describe('parseAdminFinishedGameFilters (L61-03)', () => {
  it('excludes tutorial rows by default', () => {
    const filters = parseAdminFinishedGameFilters({});
    expect(filters.excludeTutorial).toBe(true);
    const { whereSql } = buildFinishedGamesWhere(filters);
    expect(whereSql).toContain('is_tutorial = false');
  });

  it('includes tutorials when includeTutorial is true', () => {
    const filters = parseAdminFinishedGameFilters({ includeTutorial: 'true' });
    expect(filters.excludeTutorial).toBe(false);
    const { whereSql } = buildFinishedGamesWhere(filters);
    expect(whereSql).not.toContain('is_tutorial');
  });
});
