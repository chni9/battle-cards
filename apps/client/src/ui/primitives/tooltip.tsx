/**
 * Hover and focus tooltip (parity `global-tooltip-unused`: the V2 tooltip had no caller, so
 * this is the first real one). It shows while its trigger is hovered or focused, tracked
 * separately, so leaving with the pointer never closes a tooltip whose trigger still has focus
 * and a blur never closes one still hovered.
 *
 * The bubble is hoverable (WCAG 1.4.13): it takes pointer events and sits inside the hover
 * region, and the 8 px gap to the trigger is padding on its positioning span, so the pointer
 * can cross onto it. It is always rendered, `hidden` while closed, and its id is appended to
 * the trigger's own `aria-describedby`, so the description resolves even when nothing shows.
 *
 * Esc closes one layer per press (Q49). Open tooltips form a stack, most recent last, and one
 * shared capture-phase `document` keydown listener (installed while the stack is non-empty)
 * closes only the top one, then calls `stopImmediatePropagation`. Still run: `window` capture
 * listeners, and `document` capture listeners registered before the first open tooltip
 * installed it. Stopped: later `document` capture listeners, every listener below `document`,
 * every bubble-phase listener and React handlers. So sheet Esc handling (L72-09) listens in the
 * bubble phase or through React. Once open, the bubble is nudged inside the viewport so it
 * never adds a horizontal page scroll.
 */

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { CHROME_SHAPE_SM_CLASS } from './chrome-classes';

export interface TooltipProps {
  content: string;
  children: ReactElement;
  placement?: 'top' | 'bottom';
}

const VIEWPORT_GUTTER_PX = 8;

/** Close callbacks of the open tooltips, most recently opened last. */
const openTooltips: (() => void)[] = [];

function closeTopTooltipOnEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const closeTop = openTooltips.at(-1);
  if (closeTop === undefined) return;
  event.stopImmediatePropagation();
  closeTop();
}

/** Padding, not margin, bridges the gap so the pointer stays inside the hover region. */
const PLACEMENT_CLASS = { top: 'bottom-full pb-2', bottom: 'top-full pt-2' } as const;

function describedByOf(element: ReactElement): string | undefined {
  const props: unknown = element.props;
  if (typeof props !== 'object' || props === null || !('aria-describedby' in props)) return undefined;
  const ids = props['aria-describedby'];
  return typeof ids === 'string' && ids !== '' ? ids : undefined;
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps): ReactElement {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;
  const positionerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (): void => {
      setHovered(false);
      setFocused(false);
    };
    openTooltips.push(close);
    if (openTooltips.length === 1) document.addEventListener('keydown', closeTopTooltipOnEscape, true);
    return () => {
      openTooltips.splice(openTooltips.indexOf(close), 1);
      if (openTooltips.length === 0) document.removeEventListener('keydown', closeTopTooltipOnEscape, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    const positioner = positionerRef.current;
    if (!open || positioner === null) return;
    positioner.style.removeProperty('margin-left');
    const rect = positioner.getBoundingClientRect();
    const right = document.documentElement.clientWidth - VIEWPORT_GUTTER_PX;
    if (rect.left < VIEWPORT_GUTTER_PX) positioner.style.marginLeft = `${VIEWPORT_GUTTER_PX - rect.left}px`;
    else if (rect.right > right) positioner.style.marginLeft = `${right - rect.right}px`;
  }, [open]);

  const describedBy = [describedByOf(children), id].filter((value) => value !== undefined).join(' ');
  const triggerProps = { 'aria-describedby': describedBy };

  return (
    <span
      className="relative inline-flex"
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
    >
      {cloneElement(children, triggerProps)}
      <span
        ref={positionerRef}
        hidden={!open}
        className={`absolute left-1/2 z-10 w-max max-w-56 -translate-x-1/2 ${PLACEMENT_CLASS[placement]}`}
      >
        <span
          id={id}
          role="tooltip"
          data-placement={placement}
          className={`block bg-v7-panel-2 px-2 py-1 font-v7-body text-v7-caption font-bold text-v7-text ${CHROME_SHAPE_SM_CLASS}`}
        >
          {content}
        </span>
      </span>
    </span>
  );
}
