import { describe, expect, it } from 'vitest';

import { isAllowedAdminTable } from './admin-table-browser';

describe('admin table browser allowlist (L61-05)', () => {
  it('allows only the four log tables', () => {
    expect(isAllowedAdminTable('finished_games')).toBe(true);
    expect(isAllowedAdminTable('feedback_reports')).toBe(true);
    expect(isAllowedAdminTable('users')).toBe(false);
    expect(isAllowedAdminTable("'; DROP TABLE finished_games;--")).toBe(false);
  });
});
