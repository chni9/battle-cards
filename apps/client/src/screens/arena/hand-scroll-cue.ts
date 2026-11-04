/**
 * The hand's scroll-edge cue — technical spec v7 §6.1 item 4 (the hand scrolls inside itself);
 * Q87-4, designer 2026-11-03: add an edge fade (L75-13). A hand that overflows its row says so with a
 * fade on its right edge, and on its left edge once it is scrolled away from the start.
 *
 * It is the admin tables' cue (`screens/admin/admin-scroll-cue.ts`, L80-12) on both edges. That code
 * is private to `screens/admin/`, which the arena may not import, so the hand carries its own copy of
 * the pattern. It lives in a `.ts` file with the hook that feeds it (react-refresh: a `.tsx` file
 * exports components only). The layout is read, never kept: `useSyncExternalStore` asks the browser
 * again on every scroll, every resize and every render.
 */

import { useCallback, useSyncExternalStore } from 'react';

/** The three measures of a scroll region the cue needs; a plain object stands in for one in tests. */
export type ScrollExtent = Pick<HTMLElement, 'scrollWidth' | 'clientWidth' | 'scrollLeft'>;

/** The edges of a horizontal scroller that have content hidden past them: 'left' once scrolled away from the start, 'right' while more lies beyond the end. */
export type HiddenEdges = 'none' | 'left' | 'right' | 'both';

/** Browsers round a fractional scroll position, so one pixel short of an edge counts as the edge. */
const EDGE_SLACK_PX = 1;

/** Which edges of `region` hide content. A region that does not overflow (and happy-dom's zeros) hides none. */
export function hiddenEdges(region: ScrollExtent): HiddenEdges {
  const left = region.scrollLeft > EDGE_SLACK_PX;
  const right = region.scrollWidth - region.clientWidth - region.scrollLeft > EDGE_SLACK_PX;
  if (left && right) return 'both';
  if (left) return 'left';
  if (right) return 'right';
  return 'none';
}

/**
 * The hidden edges of `region`, kept current on scroll, on a resize of the region (the window
 * changes) and on a resize of its content (new cards). `null` is a region not mounted yet: no cue.
 * The snapshot is a string, so it is stable between reads.
 */
export function useHiddenEdges(region: HTMLElement | null): HiddenEdges {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (region === null) {
        return () => undefined;
      }
      region.addEventListener('scroll', notify, { passive: true });
      const observer = new ResizeObserver(notify);
      observer.observe(region);
      if (region.firstElementChild !== null) {
        observer.observe(region.firstElementChild);
      }
      return () => {
        region.removeEventListener('scroll', notify);
        observer.disconnect();
      };
    },
    [region],
  );
  const read = useCallback((): HiddenEdges => (region === null ? 'none' : hiddenEdges(region)), [region]);
  return useSyncExternalStore(subscribe, read);
}
