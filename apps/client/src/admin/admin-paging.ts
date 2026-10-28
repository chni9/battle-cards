/**
 * Page arithmetic for the paged admin tables, Matches and Database (technical spec v7 §7.8,
 * L80-06). Pure so it is tested in node.
 */

/**
 * How many pages `total` rows fill at `pageSize` rows each, never below 1. An empty list reads
 * "Page 1 of 1", never "Page 1 of 0", and a zero or negative size (no server answer yet) is one
 * page rather than a division by zero.
 */
export function adminPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

/** What the pager count reads from a page answer (`AdminGamesPage`, `AdminTablePage`). */
export interface AdminPageTotals {
  total: number;
  pageSize: number;
}

/**
 * The pager's "of M" (L80-06, L80-10). With the page for `page` loaded it is that answer's count.
 * Until then it is the last count known for the same result set, never below `page` itself, so
 * the `aria-live` label reads "Page 2 of 3" while page 2 loads, never "Page 2 of 2"; with nothing
 * known it reads one page.
 */
export function adminPagerCount(
  page: number,
  loaded: AdminPageTotals | null,
  last: AdminPageTotals | null,
): number {
  if (loaded !== null) {
    return adminPageCount(loaded.total, loaded.pageSize);
  }
  return Math.max(last === null ? 1 : adminPageCount(last.total, last.pageSize), page);
}
