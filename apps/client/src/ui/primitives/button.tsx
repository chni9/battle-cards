/**
 * Arcade chrome button (technical spec v7 §5.3): 3 px ink outline, hard shadow, 44 px floor,
 * Lilita One label. A press drops it 3 px and removes the shadow, except under reduced motion
 * (§5.7), where only the brightness changes. Disabled, it switches to the "off" look
 * (`CHROME_DISABLED_CLASS`).
 *
 * A disabled action says why (§11, Q39): `disabledReason` renders as visible text under the
 * button and joins its `aria-describedby`. By default the reason wraps freely and may widen its
 * button, so it always shows in full (§11, Q39). A caller that needs a fixed footprint (the dock,
 * L74-26 gate G5) passes `reasonLines`: the reason then never widens the button and is clamped to
 * that many lines. `reserveReasonSlot` keeps the reason line's height while enabled (16 px, or
 * the `reasonLines` lines) so a reason appearing later does not shift the layout. A native disabled button
 * leaves the Tab order, so its reason is only reachable by sight; `focusableWhenDisabled`
 * renders `aria-disabled="true"` instead, keeps the button focusable with its reason
 * described, and swallows activation (Draw, Shop and Unspy in L74).
 *
 * `className` always lands on the outermost element: the button, or the wrapper that holds
 * the button and its reason line.
 */

import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import {
  BUTTON_VARIANT_CLASS,
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_CLASS,
  ICON_WELL_CLASS,
  chromePressClass,
  iconNeedsWell,
  motionAttribute,
} from './chrome-classes';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: ButtonVariant;
  children: ReactNode;
  icon?: IconName;
  size?: 'md' | 'lg';
  disabledReason?: string;
  reserveReasonSlot?: boolean;
  /**
   * Opt-in: the reason never widens the button and is clamped to 1 (18 px) or 2 (36 px) lines,
   * which `reserveReasonSlot` then keeps. Without it the reason wraps freely and shows in full.
   */
  reasonLines?: 1 | 2;
  fullWidth?: boolean;
  className?: string;
  /** While `disabled`, stay in the Tab order as `aria-disabled` so the reason is reachable. */
  focusableWhenDisabled?: boolean;
}

const SIZE_CLASS = { md: 'min-h-11 text-v7-body', lg: 'min-h-14 text-v7-title' } as const;
const ICON_SIZE = { md: 18, lg: 22 } as const;
const WELL_SIZE_CLASS = { md: 'size-7', lg: 'size-9' } as const;

function swallowActivation(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

/** The reason's line clamp and its reserved height (the caption's 18 px line), per `reasonLines`. */
const REASON_LINES_CLASS = {
  1: { clamp: 'line-clamp-1', reserve: 'min-h-[18px]' },
  2: { clamp: 'line-clamp-2', reserve: 'min-h-9' },
} as const;

export function Button({
  variant = 'primary',
  children,
  icon,
  size = 'md',
  disabledReason,
  reserveReasonSlot = false,
  reasonLines,
  fullWidth = false,
  className,
  focusableWhenDisabled = false,
  type = 'button',
  disabled,
  onClick,
  'aria-describedby': callerDescribedBy,
  ...rest
}: ButtonProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const reasonId = useId();
  const isDisabled = disabled === true;
  const ariaDisabled = isDisabled && focusableWhenDisabled;
  const showReason = isDisabled && disabledReason !== undefined && disabledReason !== '';
  // A focusable action that can carry a reason keeps one element tree: wrapping it only once the
  // reason shows would remount the button and drop its focus to `body` (L74-26 gate G9).
  const keepsReasonSlot = focusableWhenDisabled && disabledReason !== undefined;
  const wrapped = showReason || reserveReasonSlot || keepsReasonSlot;
  const describedBy = [callerDescribedBy, showReason ? reasonId : undefined]
    .filter((id) => id !== undefined && id !== '')
    .join(' ');

  const iconElement =
    icon === undefined ? null : iconNeedsWell(variant) ? (
      <span data-icon-well className={`${ICON_WELL_CLASS} ${WELL_SIZE_CLASS[size]}`}>
        <Icon name={icon} size={ICON_SIZE[size]} />
      </span>
    ) : (
      <Icon name={icon} size={ICON_SIZE[size] + 2} />
    );

  const button = (
    <button
      {...rest}
      type={type}
      {...(ariaDisabled
        ? { 'aria-disabled': true, onClick: swallowActivation }
        : {
            ...(disabled !== undefined ? { disabled } : {}),
            ...(onClick !== undefined ? { onClick } : {}),
          })}
      {...(describedBy !== '' ? { 'aria-describedby': describedBy } : {})}
      data-variant={variant}
      data-motion={motionAttribute(reduced)}
      className={[
        'inline-flex select-none items-center justify-center gap-2 px-4 font-v7-display leading-none tracking-wide',
        CHROME_SHAPE_CLASS,
        CHROME_FOCUS_CLASS,
        CHROME_DISABLED_CLASS,
        BUTTON_VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        ariaDisabled ? '' : chromePressClass(reduced),
        fullWidth ? 'w-full' : '',
        wrapped ? '' : (className ?? ''),
      ].join(' ')}
    >
      {iconElement}
      <span>{children}</span>
    </button>
  );

  if (!wrapped) return button;
  return (
    <span className={`inline-flex flex-col items-stretch gap-1 ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}>
      {button}
      {/* With `reasonLines`, `w-0 min-w-full` keeps the reason from widening the button: it wraps
          under it, clamped to those lines, and a reserved slot holds them, so a reason that comes
          and goes never moves the layout (the dock at 360 and 375 px, L74-26 gate G5). Without it
          the reason wraps freely and shows in full. */}
      <span
        data-reason-slot
        className={[
          reasonLines === undefined ? '' : `w-0 min-w-full ${REASON_LINES_CLASS[reasonLines].clamp}`,
          'font-v7-body text-v7-caption font-bold text-v7-text-2',
          reserveReasonSlot
            ? reasonLines === undefined
              ? 'min-h-4'
              : REASON_LINES_CLASS[reasonLines].reserve
            : showReason
              ? 'min-h-4'
              : 'hidden',
        ]
          .filter((part) => part !== '')
          .join(' ')}
        {...(showReason ? { id: reasonId } : { 'aria-hidden': 'true' as const })}
      >
        {showReason ? disabledReason : ''}
      </span>
    </span>
  );
}
