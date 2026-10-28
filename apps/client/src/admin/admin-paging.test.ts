import { describe, expect, it } from 'vitest';

import { adminPageCount, adminPagerCount } from './admin-paging';

describe('adminPageCount (technical spec v7 §7.8, L80-06)', () => {
  it('counts pages and never returns 0', () => {
    expect(adminPageCount(0, 50)).toBe(1);
    expect(adminPageCount(50, 50)).toBe(1);
    expect(adminPageCount(51, 50)).toBe(2);
    expect(adminPageCount(120, 50)).toBe(3);
    expect(adminPageCount(10, 0)).toBe(1);
  });
});

describe('adminPagerCount (technical spec v7 §7.8, L80-06, L80-10)', () => {
  it('reads the loaded page when there is one', () => {
    expect(adminPagerCount(2, { total: 120, pageSize: 50 }, { total: 500, pageSize: 50 })).toBe(3);
    expect(adminPagerCount(1, { total: 0, pageSize: 50 }, null)).toBe(1);
  });

  it('keeps the last known count while a page loads, never below the page itself', () => {
    expect(adminPagerCount(2, null, { total: 120, pageSize: 50 })).toBe(3);
    expect(adminPagerCount(4, null, { total: 120, pageSize: 50 })).toBe(4);
  });

  it('reads one page when nothing is known yet', () => {
    expect(adminPagerCount(1, null, null)).toBe(1);
    expect(adminPagerCount(2, null, null)).toBe(2);
  });
});
