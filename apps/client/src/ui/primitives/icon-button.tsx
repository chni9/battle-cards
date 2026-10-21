/**
 * Icon-only arcade chrome control (technical spec v7 §5.6, L59-01): a 44 px square whose name
 * is the required `aria-label`. The native `title` defaults to that name so a mouse user gets
 * the same words; `title={null}` removes it, a string replaces it.
 *
 * `count` draws an aria-hidden badge when above zero, so the caller's `aria-label` carries the
 * number ("Chat, 3 unread"). The default variant is `quiet`. The root is `relative` for that
 * badge, so a caller positions the button with a wrapper, not with `absolute` in `className`.
 */

import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import type { ButtonVariant } from './button';
import {
  BUTTON_VARIANT_CLASS,
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  ICON_WELL_CLASS,
  chromePressClass,
  iconNeedsWell,
  motionAttribute,
} from './chrome-classes';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'title' | 'className'> {
  'aria-label': string;
  icon: IconName;
  count?: number;
  variant?: ButtonVariant;
  title?: string | null;
  className?: string;
}

export function IconButton({
  'aria-label': ariaLabel,
  icon,
  count,
  variant = 'quiet',
  title,
  className,
  type = 'button',
  ...rest
}: IconButtonProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const nativeTitle = title === null ? undefined : (title ?? ariaLabel);
  return (
    <button
      {...rest}
      type={type}
      aria-label={ariaLabel}
      {...(nativeTitle !== undefined ? { title: nativeTitle } : {})}
      data-variant={variant}
      data-motion={motionAttribute(reduced)}
      className={[
        'relative inline-flex size-11 shrink-0 select-none items-center justify-center',
        CHROME_SHAPE_SM_CLASS,
        CHROME_FOCUS_CLASS,
        CHROME_DISABLED_CLASS,
        BUTTON_VARIANT_CLASS[variant],
        chromePressClass(reduced),
        className ?? '',
      ].join(' ')}
    >
      {iconNeedsWell(variant) ? (
        <span data-icon-well className={`${ICON_WELL_CLASS} size-8`}>
          <Icon name={icon} size={20} />
        </span>
      ) : (
        <Icon name={icon} size={24} />
      )}
      {count !== undefined && count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-v7-ink bg-v7-cta px-1 font-v7-display text-v7-micro leading-none text-v7-text-on-cta"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
