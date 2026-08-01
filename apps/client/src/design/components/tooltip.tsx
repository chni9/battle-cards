/**
 * Accessible Tooltip — L12-08. Hover + focus; no new dependency.
 * technical spec v2 §6.1 unavailable-card reasons.
 */

import {
  useId,
  useState,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  /** When false, children render without tooltip chrome. */
  enabled?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  enabled = true,
  className = '',
}: TooltipProps): ReactElement {
  const tipId = useId();
  const [open, setOpen] = useState(false);

  if (!enabled || content === '') {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      onFocus={(event: FocusEvent<HTMLSpanElement>) => {
        if (event.currentTarget.contains(event.target)) {
          setOpen(true);
        }
      }}
      onBlur={(event: FocusEvent<HTMLSpanElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <span aria-describedby={open ? tipId : undefined}>{children}</span>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-[12rem] -translate-x-1/2 rounded-[length:var(--radius-control)] border border-border bg-ink px-2 py-1 text-center text-[11px] font-medium leading-snug text-cta-label-on-dark shadow-md"
        >
          {content}
        </span>
      )}
    </span>
  );
}
