/**
 * Strings of the shared admin filters form (technical spec v7 §7.8, L80-03). They sit in a
 * `.ts` file because a `.tsx` file exports components only (react-refresh).
 */

/**
 * The empty option of the Seat count select (spec v7 Appendix B, new string). It reads like the
 * Kit select's existing 'Any kit' and sends no `occupancy` (`filtersToQuery` drops an empty one).
 */
export const ANY_SEAT_COUNT_LABEL = 'Any seat count';
