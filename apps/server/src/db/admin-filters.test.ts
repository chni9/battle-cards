import { describe, expect, it } from 'vitest';

import { buildFinishedGamesWhere, parseAdminFinishedGameFilters } from './admin-filters';

describe('parseAdminFinishedGameFilters (L61-03)', () => {
  it('excludes tutorial rows by default', () => {
    const filters = parseAdminFinishedGameFilters({});
    expect(filters.excludeTutorial).toBe(true);
    expect(filters.bots).toBe('all');
    expect(filters.actors).toBe('both');
    const { whereSql } = buildFinishedGamesWhere(filters);
    expect(whereSql).toContain('is_tutorial = false');
    expect(whereSql).not.toContain('is_bot');
  });

  it('parses actors=humans without changing match mix', () => {
    const filters = parseAdminFinishedGameFilters({ actors: 'humans' });
    expect(filters.actors).toBe('humans');
    expect(filters.bots).toBe('all');
    const { whereSql } = buildFinishedGamesWhere(filters);
    expect(whereSql).not.toContain('has_bots');
    expect(whereSql).not.toContain('is_bot');
  });

  it('includes tutorials when includeTutorial is true', () => {
    const filters = parseAdminFinishedGameFilters({ includeTutorial: 'true' });
    expect(filters.excludeTutorial).toBe(false);
    const { whereSql } = buildFinishedGamesWhere(filters);
    expect(whereSql).not.toContain('is_tutorial');
  });

  it('treats naive datetime-local From/To as UTC', () => {
    const filters = parseAdminFinishedGameFilters({
      from: '2026-09-18T09:00',
      to: '2026-09-18T18:30:00',
    });
    expect(filters.endedFrom?.toISOString()).toBe('2026-09-18T09:00:00.000Z');
    expect(filters.endedTo?.toISOString()).toBe('2026-09-18T18:30:00.000Z');
  });

  it('keeps explicit offsets on From/To', () => {
    const filters = parseAdminFinishedGameFilters({
      from: '2026-09-18T09:00:00.000Z',
      to: '2026-09-18T11:00:00+02:00',
    });
    expect(filters.endedFrom?.toISOString()).toBe('2026-09-18T09:00:00.000Z');
    expect(filters.endedTo?.toISOString()).toBe('2026-09-18T09:00:00.000Z');
  });
});
