import { describe, expect, it } from 'vitest';

import { adminPageCount } from './admin-paging';

describe('adminPageCount (technical spec v7 §7.8, L80-06)', () => {
  it('counts pages and never returns 0', () => {
    expect(adminPageCount(0, 50)).toBe(1);
    expect(adminPageCount(50, 50)).toBe(1);
    expect(adminPageCount(51, 50)).toBe(2);
    expect(adminPageCount(120, 50)).toBe(3);
    expect(adminPageCount(10, 0)).toBe(1);
  });
});
