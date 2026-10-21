/**
 * Arcade chrome button (technical spec v7 §5.3): 3 px ink outline, hard shadow, 44 px floor,
 * Lilita One label. A press drops it 3 px and removes the shadow, except under reduced motion
 * (§5.7), where only the brightness changes.
 *
 * A disabled action says why (§11, Q39): `disabledReason` renders as visible text under the
 * button and joins its `aria-describedby`. `reserveReasonSlot` keeps that line's height while
 * enabled so a reason appearing later does not shift the layout.
 */

import { useId, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
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
  fullWidth?: boolean;
  className?: string;
}

const SIZE_CLASS = { md: 'min-h-11 text-v7-body', lg: 'min-h-14 text-v7-title' } as const;
const ICON_SIZE = { md: 18, lg: 22 } as const;
const WELL_SIZE_CLASS = { md: 'size-7', lg: 'size-9' } as const;

export function Button({
  variant = 'primary',
  children,
  icon,
  size = 'md',
  disabledReason,
  reserveReasonSlot = false,
  fullWidth = false,
  className,
  type = 'button',
  disabled,
  'aria-describedby': callerDescribedBy,
  ...rest
}: ButtonProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const reasonId = useId();
  const showReason = disabled === true && disabledReason !== undefined && disabledReason !== '';
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
      {...(disabled !== undefined ? { disabled } : {})}
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
        chromePressClass(reduced),
        fullWidth ? 'w-full' : '',
        className ?? '',
      ].join(' ')}
    >
      {iconElement}
      <span>{children}</span>
    </button>
  );

  if (!showReason && !reserveReasonSlot) return button;
  return (
    <span className={`inline-flex flex-col items-stretch gap-1 ${fullWidth ? 'w-full' : ''}`}>
      {button}
      <span
        data-reason-slot
        className="min-h-4 font-v7-body text-v7-caption font-bold text-v7-text-2"
        {...(showReason ? { id: reasonId } : { 'aria-hidden': 'true' as const })}
      >
        {showReason ? disabledReason : ''}
      </span>
    </span>
  );
}
