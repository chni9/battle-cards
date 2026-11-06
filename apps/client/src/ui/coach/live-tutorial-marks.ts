/**
 * The live tutorial marks, read from the DOM — technical spec v7 §6.12; Lot 75 plan Appendix A.8.6
 * (L75-04) and the final-review M2 (one reader for the callout layer and the coach placement, so
 * the coach never dodges a mark the layer does not draw, or the reverse).
 *
 * A mark is live when it sits in the live sheet layer (`liveSheetId`) — or, with no sheet live, in
 * the table — is not inside an `inert` subtree, and is not empty. Rects are in viewport
 * coordinates; callers subtract the visual viewport's offset.
 */

import type { CalloutRect } from './tutorial-callout-geometry';

export const TUTORIAL_MARK_SELECTOR = '[data-tutorial-highlight]';

export interface LiveTutorialMark {
  /** The element's `data-tutorial-highlight` value, `''` for any other selector. */
  readonly id: string;
  readonly rect: CalloutRect;
}

/**
 * Every live element matching `selector` (the tutorial marks by default), in document order.
 * `live` is the live sheet's id, `null` while no sheet is open.
 */
export function liveTutorialMarks(live: string | null, selector: string = TUTORIAL_MARK_SELECTOR): readonly LiveTutorialMark[] {
  const marks: LiveTutorialMark[] = [];
  for (const element of Array.from(document.querySelectorAll(selector))) {
    if (element.closest('[inert]') !== null) continue;
    const sheetId = element.closest('[data-zone="sheet-overlay"]')?.getAttribute('data-sheet-id') ?? null;
    if (sheetId !== live) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    marks.push({
      id: element.getAttribute('data-tutorial-highlight') ?? '',
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    });
  }
  return marks;
}
