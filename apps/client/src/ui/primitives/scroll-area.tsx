/**
 * Scroll container for logs, chat and sheet bodies (L53-07: overlays scroll inside and never
 * page-scroll). Overscroll is contained so a fling at the end does not scroll or reload the
 * page underneath; the cross axis is clipped.
 *
 * A `label` makes it a named region with `tabIndex={0}`, so keyboard users can scroll it
 * (WCAG 2.1.1). Without one it is still a Tab stop whenever it overflows and holds nothing
 * focusable, because Chromium makes such scrollers keyboard-focusable on its own, and that
 * stop has no name. Pass a `label` whenever the content can overflow.
 *
 * A labelled area also carries `data-scroll-region`, the mark the sheet focus trap reads
 * (`use-focus-trap.ts`): inside a sheet, initial focus goes to the first focusable thing that is
 * not a scroll region, so a message field after a transcript keeps it, and the region is focused
 * only when nothing else is (a read-only transcript). The Sheet body marks itself the same way.
 *
 * It is `relative`, like every V7 scroll container, so `sr-only` labels and other absolutely
 * positioned descendants resolve against it and stay inside its clip instead of stretching an
 * ancestor's scroll size.
 *
 * `focusRing` says where the focus ring goes. The default `outer` ring sits 2 px outside the edge.
 * An area that fills a clipping, rounded container (the coach panel body, L72-17) takes `inset`,
 * the same ring drawn inside the edge (`CHROME_FOCUS_INSET_CLASS`), so the container never clips it.
 */

import type { ReactElement, ReactNode, Ref } from 'react';
import { CHROME_FOCUS_CLASS, CHROME_FOCUS_INSET_CLASS } from './chrome-classes';
import { SCROLL_REGION_ATTRIBUTE } from './use-focus-trap';

export interface ScrollAreaProps {
  children: ReactNode;
  axis?: 'y' | 'x' | 'both';
  label?: string;
  /** Where the keyboard focus ring is drawn: outside the edge (default) or inside it. */
  focusRing?: 'outer' | 'inset';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const AXIS_CLASS = {
  y: 'overflow-y-auto overflow-x-hidden overscroll-y-contain',
  x: 'overflow-x-auto overflow-y-hidden overscroll-x-contain',
  both: 'overflow-auto overscroll-contain',
} as const;

const FOCUS_RING_CLASS = { outer: CHROME_FOCUS_CLASS, inset: CHROME_FOCUS_INSET_CLASS } as const;

export function ScrollArea({
  children,
  axis = 'y',
  label,
  focusRing = 'outer',
  className,
  ref,
}: ScrollAreaProps): ReactElement {
  return (
    <div
      ref={ref}
      data-scroll-axis={axis}
      {...(label !== undefined
        ? { role: 'region', 'aria-label': label, tabIndex: 0, [SCROLL_REGION_ATTRIBUTE]: '' }
        : {})}
      className={['relative min-h-0 min-w-0', AXIS_CLASS[axis], FOCUS_RING_CLASS[focusRing], className ?? ''].join(' ')}
    >
      {children}
    </div>
  );
}
