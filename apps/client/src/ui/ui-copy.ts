/**
 * The only strings `ui/` adds itself: the new strings (technical spec v7 §10.6) a Lot 72
 * component needs, each listed in the PR for designer review. L72-09 appends `MINIMIZE_LABEL`,
 * L72-16 appends `TABLE_RULES_LABEL`, and the L72-21 final review moves in
 * `shieldPointsLabel` (L72-11) and `ELIMINATED_LABEL` with `eliminatedPortraitLabel` (L72-15),
 * which first lived beside their components. Every other label (dismiss, previous and next,
 * icon-button names, info controls) is passed in by the caller from existing copy. English only.
 */

/** Greyed kits say so in words, never by color alone (Q15, Q23; spec v7 §7.3, §7.4, §11). */
export const EXCLUDED_LABEL = 'Excluded';

/** The Carousel's polite status line, "{label}, {n} of {m}" (L72-08 fix round 1; WAI-ARIA APG carousel). */
export function carouselPositionLabel(label: string, position: number, count: number): string {
  return `${label}, ${String(position)} of ${String(count)}`;
}

/** Blocking sub-choice sheets collapse to a bar (spec v7 §6.7, §10.6, Q59). */
export const MINIMIZE_LABEL = 'Minimize';

/** The house-rules strip's name and its sheet's title (spec v7 §6.11, §7.4, §10.6). */
export const TABLE_RULES_LABEL = 'Table rules';

/**
 * A shield amount's spoken text and default title, "{n} shield point(s)" (spec v7 §10.6, Appendix A
 * `global-card-effect-copy-inline-icons`; decisions.md 2026-10-26). The V2 glyph spoke only the number.
 */
export function shieldPointsLabel(amount: number): string {
  return `${String(amount)} shield ${amount === 1 ? 'point' : 'points'}`;
}

/** The eliminated state in words: the `eliminated` icon's label (spec v7 §10.6, L72-15; the seat status never rides on the cross alone). */
export const ELIMINATED_LABEL = 'Eliminated';

/** An eliminated kit portrait's accessible name, "{kit}, eliminated" (L72-15 fix round 1; spec v7 §10.6, §11). */
export function eliminatedPortraitLabel(name: string): string {
  return `${name}, ${ELIMINATED_LABEL.toLowerCase()}`;
}
