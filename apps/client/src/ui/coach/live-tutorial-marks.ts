/**
 * The live tutorial marks, read from the DOM — technical spec v7 §6.12; Lot 75 plan Appendix A.8.6
 * (L75-04) and the final-review M2 (one reader for the callout layer and the coach placement, so
 * the coach never dodges a mark the layer does not draw, or the reverse).
 *
 * A mark is live when it sits in the live sheet layer (`liveSheetId`) — or, with no sheet live, in
 * the table — is not inside an `inert` subtree, and is not empty. Rects are in viewport
 * coordinates; callers subtract the visual viewport's offset.
 *
 * A mark inside a scrollport (the landscape hand, a sheet body) can sit partly or wholly outside
 * it. Its rect is cut to what its clipping ancestors show, so a ring never lands on whatever is
 * painted beside the scrollport (L75-12 Gate C: at 844×390 the Specials tour ring sat on Draw), and
 * `revealTutorialMarks` scrolls it into view when its step starts.
 */

import type { CalloutRect } from './tutorial-callout-geometry';

export const TUTORIAL_MARK_SELECTOR = '[data-tutorial-highlight]';

export interface LiveTutorialMark {
  /** The element's `data-tutorial-highlight` value, `''` for any other selector. */
  readonly id: string;
  readonly rect: CalloutRect;
}

/** One axis of a box, `start` to `end` in px. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * How far a scrollport shows `port` must scroll so `target` shows too: 0 when it already fits,
 * else the nearest edge lines up; a target longer than the port lines up its start.
 */
export function revealOffset(target: Span, port: Span): number {
  if (target.start >= port.start && target.end <= port.end) return 0;
  if (target.end - target.start > port.end - port.start || target.start < port.start) return target.start - port.start;
  return target.end - port.end;
}

function liveElements(live: string | null, selector: string): Element[] {
  return Array.from(document.querySelectorAll(selector)).filter((element) => {
    if (element.closest('[inert]') !== null) return false;
    const sheetId = element.closest('[data-zone="sheet-overlay"]')?.getAttribute('data-sheet-id') ?? null;
    return sheetId === live;
  });
}

const CLIPS = /^(hidden|clip|auto|scroll)$/;

/** `element`'s rect cut to every ancestor that clips an axis (`hidden`, `clip`, `auto` or `scroll` overflow), or null when nothing shows. */
function visibleRect(element: Element): CalloutRect | null {
  let { left, top, right, bottom } = element.getBoundingClientRect();
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const clipsX = CLIPS.test(style.overflowX);
    const clipsY = CLIPS.test(style.overflowY);
    if (!clipsX && !clipsY) continue;
    const box = parent.getBoundingClientRect();
    if (clipsX) {
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    if (clipsY) {
      top = Math.max(top, box.top);
      bottom = Math.min(bottom, box.bottom);
    }
  }
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}

/**
 * Every live element matching `selector` (the tutorial marks by default), in document order, with
 * the part of it its scrollports show. `live` is the live sheet's id, `null` while no sheet is open.
 */
export function liveTutorialMarks(live: string | null, selector: string = TUTORIAL_MARK_SELECTOR): readonly LiveTutorialMark[] {
  const marks: LiveTutorialMark[] = [];
  for (const element of liveElements(live, selector)) {
    const rect = visibleRect(element);
    if (rect === null) continue;
    marks.push({ id: element.getAttribute('data-tutorial-highlight') ?? '', rect });
  }
  return marks;
}

/** The live marks' ids in document order, space-separated, hidden ones included: what a step marks, before any scrolling. */
export function liveTutorialMarkIds(live: string | null): string {
  return liveElements(live, TUTORIAL_MARK_SELECTOR)
    .map((element) => element.getAttribute('data-tutorial-highlight') ?? '')
    .join(' ');
}

const SCROLLS = /^(auto|scroll)$/;

/** Scrolls each live mark's nearest scrollport (an `auto` or `scroll` overflow that overflows) so the mark shows (`revealOffset`). */
export function revealTutorialMarks(live: string | null): void {
  for (const element of liveElements(live, TUTORIAL_MARK_SELECTOR)) {
    for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const scrollsX = SCROLLS.test(style.overflowX) && parent.scrollWidth > parent.clientWidth;
      const scrollsY = SCROLLS.test(style.overflowY) && parent.scrollHeight > parent.clientHeight;
      if (!scrollsX && !scrollsY) continue;
      const target = element.getBoundingClientRect();
      const port = parent.getBoundingClientRect();
      if (scrollsX) parent.scrollLeft += revealOffset({ start: target.left, end: target.right }, { start: port.left, end: port.right });
      if (scrollsY) parent.scrollTop += revealOffset({ start: target.top, end: target.bottom }, { start: port.top, end: port.bottom });
      break;
    }
  }
}
