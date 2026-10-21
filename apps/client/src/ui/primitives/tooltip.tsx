/**
 * Hover and focus tooltip (parity `global-tooltip-unused`: the V2 tooltip had no caller, so
 * this is the first real one). It opens on focus or hover and closes on blur, pointer leave
 * or Esc.
 *
 * The bubble is always rendered, `hidden` while closed, and its id is appended to the
 * trigger's own `aria-describedby`, so the description resolves even when nothing is shown.
 * While open, a capture-phase `document` keydown listener swallows the Esc that closes it: one
 * press dismisses one layer, never the sheet underneath as well (Q49). Once open, the bubble
 * is nudged back inside the viewport so it never adds a horizontal page scroll.
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

export interface TooltipProps {
  content: string;
  children: ReactElement;
  placement?: 'top' | 'bottom';
}

const VIEWPORT_GUTTER_PX = 8;

const PLACEMENT_CLASS = { top: 'bottom-full mb-2', bottom: 'top-full mt-2' } as const;

function describedByOf(element: ReactElement): string | undefined {
  const props: unknown = element.props;
  if (typeof props !== 'object' || props === null || !('aria-describedby' in props)) return undefined;
  const ids = props['aria-describedby'];
  return typeof ids === 'string' && ids !== '' ? ids : undefined;
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || bubble === null) return;
    bubble.style.removeProperty('margin-left');
    const rect = bubble.getBoundingClientRect();
    const right = document.documentElement.clientWidth - VIEWPORT_GUTTER_PX;
    if (rect.left < VIEWPORT_GUTTER_PX) bubble.style.marginLeft = `${VIEWPORT_GUTTER_PX - rect.left}px`;
    else if (rect.right > right) bubble.style.marginLeft = `${right - rect.right}px`;
  }, [open]);

  const describedBy = [describedByOf(children), id].filter((value) => value !== undefined).join(' ');
  const triggerProps = { 'aria-describedby': describedBy };

  return (
    <span
      className="relative inline-flex"
      onFocus={() => {
        setOpen(true);
      }}
      onBlur={() => {
        setOpen(false);
      }}
      onPointerEnter={() => {
        setOpen(true);
      }}
      onPointerLeave={() => {
        setOpen(false);
      }}
    >
      {cloneElement(children, triggerProps)}
      <span
        ref={bubbleRef}
        id={id}
        role="tooltip"
        hidden={!open}
        data-placement={placement}
        className={[
          'pointer-events-none absolute left-1/2 z-10 w-max max-w-56 -translate-x-1/2 px-2 py-1',
          'rounded-v7-chrome-sm border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel-2 shadow-v7-chrome',
          'font-v7-body text-v7-caption font-bold text-v7-text',
          PLACEMENT_CLASS[placement],
        ].join(' ')}
      >
        {content}
      </span>
    </span>
  );
}
