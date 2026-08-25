/**
 * Tutorial spotlight — thick orange pulse + a pointing arrow (technical spec v6 §5.4).
 * Presentation only; the server still filters legality.
 * The arrow sits outside the highlight square, pointing at it.
 */

import type { ReactElement, ReactNode } from 'react';

export type TutorialArrowSide = 'top' | 'bottom';

export interface TutorialCalloutProps {
  active: boolean;
  /** `top` sits above (points down); `bottom` below (points up). */
  arrow?: TutorialArrowSide;
  highlightId?: string;
  className?: string;
  children: ReactNode;
}

export function TutorialCallout({
  active,
  arrow = 'top',
  highlightId,
  className = '',
  children,
}: TutorialCalloutProps): ReactElement {
  return (
    <span
      className={[
        'relative inline-flex max-w-full',
        active ? 'tutorial-callout' : '',
        className,
      ].join(' ')}
      {...(active && highlightId !== undefined
        ? { 'data-tutorial-highlight': highlightId }
        : {})}
    >
      {active ? (
        <span
          className={`tutorial-callout-arrow tutorial-callout-arrow--${arrow}`}
          aria-hidden
        >
          <svg viewBox="0 0 32 28" className="tutorial-callout-arrow__icon">
            <path
              d="M16 26 1.5 9.5h7.5V1.5h14v8h7.5L16 26z"
              fill="#f0771f"
              stroke="#ffffff"
              strokeWidth="2.25"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
      {children}
    </span>
  );
}
