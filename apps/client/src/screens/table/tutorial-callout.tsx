/**
 * Tutorial spotlight — thick pulse + a pointing arrow (technical spec v6 §5.4).
 * Guide tone is orange (scripted control). Threat tone is red (incoming Attack / Spy / Thief).
 * Presentation only; the server still filters legality.
 * The arrow sits outside the highlight square, pointing at it.
 */

import type { ReactElement, ReactNode } from 'react';

export type TutorialArrowSide = 'top' | 'bottom';

export type TutorialCalloutTone = 'guide' | 'threat';

export interface TutorialCalloutProps {
  active: boolean;
  /** `top` sits above (points down); `bottom` below (points up). */
  arrow?: TutorialArrowSide;
  /** Orange scripted control (default) vs red incoming threat. */
  tone?: TutorialCalloutTone;
  /** `stretch` wraps a block zone without becoming an inline span. */
  layout?: 'inline' | 'stretch';
  highlightId?: string;
  className?: string;
  children: ReactNode;
}

export function TutorialCallout({
  active,
  arrow = 'top',
  tone = 'guide',
  layout = 'inline',
  highlightId,
  className = '',
  children,
}: TutorialCalloutProps): ReactElement {
  const fill = tone === 'threat' ? '#d62828' : '#f0771f';
  const Tag = layout === 'stretch' ? 'div' : 'span';

  return (
    <Tag
      className={[
        'relative max-w-full',
        layout === 'stretch' ? 'flex min-h-0 w-full flex-col' : 'inline-flex',
        active ? 'tutorial-callout' : '',
        active && tone === 'threat' ? 'tutorial-callout--threat' : '',
        className,
      ].join(' ')}
      {...(active && highlightId !== undefined
        ? { 'data-tutorial-highlight': highlightId }
        : {})}
    >
      {active ? (
        <span
          className={`tutorial-callout-arrow tutorial-callout-arrow--${arrow}${tone === 'threat' ? ' tutorial-callout-arrow--threat' : ''}`}
          aria-hidden
        >
          <svg viewBox="0 0 32 28" className="tutorial-callout-arrow__icon">
            <path
              d="M16 26 1.5 9.5h7.5V1.5h14v8h7.5L16 26z"
              fill={fill}
              stroke="#ffffff"
              strokeWidth="2.25"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
      {children}
    </Tag>
  );
}
