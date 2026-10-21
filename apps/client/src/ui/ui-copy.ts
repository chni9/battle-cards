/**
 * The only strings `ui/` adds itself: the new strings (technical spec v7 §10.6) a Lot 72
 * component needs, each listed in the PR for designer review. L72-09 appends `MINIMIZE_LABEL`
 * and L72-16 appends `TABLE_RULES_LABEL`. Every other label (dismiss, previous and next,
 * icon-button names, info controls) is passed in by the caller from existing copy. English only.
 */

/** Greyed kits say so in words, never by color alone (Q15, Q23; spec v7 §7.3, §7.4, §11). */
export const EXCLUDED_LABEL = 'Excluded';

/** The Carousel's polite status line, "{label}, {n} of {m}" (L72-08 fix round 1; WAI-ARIA APG carousel). */
export function carouselPositionLabel(label: string, position: number, count: number): string {
  return `${label}, ${String(position)} of ${String(count)}`;
}
