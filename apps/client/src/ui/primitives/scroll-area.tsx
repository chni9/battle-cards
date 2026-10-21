/**
 * Scroll container for logs, chat and sheet bodies (L53-07: overlays scroll inside and never
 * page-scroll). Overscroll is contained so a fling at the end does not scroll or reload the
 * page underneath; the cross axis is clipped.
 *
 * A `label` makes it a named region with `tabIndex={0}`, so keyboard users can scroll it
 * (WCAG 2.1.1). Without one it is still a Tab stop whenever it overflows and holds nothing
 * focusable, because Chromium makes such scrollers keyboard-focusable on its own, and that
 * stop has no name. Pass a `label` whenever the content can overflow.
 */

import type { ReactElement, ReactNode, Ref } from 'react';
import { CHROME_FOCUS_CLASS } from './chrome-classes';

export interface ScrollAreaProps {
  children: ReactNode;
  axis?: 'y' | 'x' | 'both';
  label?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const AXIS_CLASS = {
  y: 'overflow-y-auto overflow-x-hidden overscroll-y-contain',
  x: 'overflow-x-auto overflow-y-hidden overscroll-x-contain',
  both: 'overflow-auto overscroll-contain',
} as const;

export function ScrollArea({ children, axis = 'y', label, className, ref }: ScrollAreaProps): ReactElement {
  return (
    <div
      ref={ref}
      data-scroll-axis={axis}
      {...(label !== undefined ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}
      className={['min-h-0 min-w-0', AXIS_CLASS[axis], CHROME_FOCUS_CLASS, className ?? ''].join(' ')}
    >
      {children}
    </div>
  );
}
