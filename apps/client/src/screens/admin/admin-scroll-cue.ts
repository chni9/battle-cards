/**
 * The "more to the right" cue of a wide admin table (technical spec v7 §7.8, L80-12). A table that
 * overflows a 390 px phone scrolls sideways inside its region, and nothing on screen said there
 * was more: the designer's critique of /admin found the Matches table cut off with no hint. The
 * cue shows while the region overflows and is not scrolled to its end.
 *
 * It lives in a `.ts` file with the hook that feeds it (react-refresh: a `.tsx` file exports
 * components only). The layout is read, never kept: `useSyncExternalStore` asks the browser again
 * on every scroll, every resize and every render.
 */

import { useCallback, useSyncExternalStore } from 'react';

/** The three measures of a scroll region the cue needs; a plain object stands in for one in tests. */
export type ScrollExtent = Pick<HTMLElement, 'scrollWidth' | 'clientWidth' | 'scrollLeft'>;

/** Browsers round a fractional scroll position, so one pixel short of the end counts as the end. */
const END_SLACK_PX = 1;

/** True while the region overflows sideways and has more content past its right edge. */
export function hasMoreToTheRight(region: ScrollExtent): boolean {
  return region.scrollWidth - region.clientWidth - region.scrollLeft > END_SLACK_PX;
}

/**
 * Whether `region` has more content to its right, kept current on scroll, on a resize of the
 * region (the window changes) and on a resize of its content (new rows). `null` is a region not
 * mounted yet, or an empty table: no cue.
 */
export function useMoreToTheRight(region: HTMLElement | null): boolean {
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
  const read = useCallback(() => region !== null && hasMoreToTheRight(region), [region]);
  return useSyncExternalStore(subscribe, read);
}
