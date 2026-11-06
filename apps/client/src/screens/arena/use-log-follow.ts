/**
 * The log's follow rule, shared by the log sheet and the desktop log panel — technical spec v7
 * §6.9; Appendix A `table-action-log-panel` (V2's 48 px stick); L74-15, moved here in L75-02.
 *
 * While `active`, the log opens on the newest line, then follows new lines only while the reader
 * is within 48 px of the bottom (`followLogScroll`). A `ResizeObserver` on the content and on the
 * scrollport keeps it stuck when lines land or the port resizes (a sheet mounts its content hidden,
 * so only an observer sees it gain a
 * height). Every stick refreshes `lastTop`, so the scroll event Chrome fires after new lines land,
 * with `scrollTop` unchanged, never unsticks the log (L74-26 G27; review M3).
 */

import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

import { followLogScroll, type LogFollowState } from './log-sheet-model';

/** While `active`: open on the newest line, follow within 48 px, refresh `lastTop` on every stick. */
export function useLogFollow(
  active: boolean,
  content: RefObject<HTMLElement | null>,
  scrollerOf: (content: HTMLElement) => HTMLElement | null,
): void {
  /** Whether the reader is at the bottom, so the next new line should follow. Starts true: open on the newest. */
  const stuck = useRef<LogFollowState>({ stuck: true, lastTop: 0 });
  // Read when the log activates: the callers pass a fresh arrow every render, which must not re-run the effect.
  const findScroller = useEffectEvent((body: HTMLElement): HTMLElement | null => scrollerOf(body));

  useEffect(() => {
    if (!active) {
      return;
    }

    const body = content.current;
    const scroller = body === null ? null : findScroller(body);

    if (body === null || scroller === null) {
      return;
    }
    // Every opening starts on the newest line.
    stuck.current = { stuck: true, lastTop: scroller.scrollTop };

    const follow = (): void => {
      stuck.current = followLogScroll(stuck.current, scroller);
    };
    const stick = (): void => {
      if (stuck.current.stuck) {
        scroller.scrollTop = scroller.scrollHeight;
      }
      stuck.current = { ...stuck.current, lastTop: scroller.scrollTop };
    };
    const observer = new ResizeObserver(stick);

    scroller.addEventListener('scroll', follow, { passive: true });
    observer.observe(body);
    // The scrollport too: a desktop panel that shrinks with the window gains no content, yet must keep the newest line in view.
    observer.observe(scroller);
    stick();

    return () => {
      scroller.removeEventListener('scroll', follow);
      observer.disconnect();
    };
  }, [active, content]);
}
