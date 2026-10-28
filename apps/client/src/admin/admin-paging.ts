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
