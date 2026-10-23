/**
 * On/off switch as an `aria-pressed` button (technical spec v7 §11: real `aria-pressed`
 * semantics; §7.4 kit toggles, §9 sound and vibration). State reads from the knob position
 * (`data-toggle-knob="on" | "off"`), not from color alone; the track fill is only a second
 * cue. The knob slides only when motion is full (§5.7); under reduced motion it jumps.
 */

import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import {
  BUTTON_VARIANT_CLASS,
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  chromePressClass,
  motionAttribute,
} from './chrome-classes';

export interface ToggleProps {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon?: IconName;
  labelHidden?: boolean;
  disabled?: boolean;
}

export function Toggle({
  label,
  pressed,
  onPressedChange,
  icon,
  labelHidden = false,
  disabled = false,
}: ToggleProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      data-motion={motionAttribute(reduced)}
      onClick={() => {
        onPressedChange(!pressed);
      }}
      className={[
        'inline-flex min-h-11 min-w-11 select-none items-center gap-2 px-3 font-v7-body text-v7-body font-extrabold',
        CHROME_SHAPE_SM_CLASS,
        CHROME_FOCUS_CLASS,
        CHROME_DISABLED_CLASS,
        BUTTON_VARIANT_CLASS.quiet,
        chromePressClass(reduced),
      ].join(' ')}
    >
      {icon !== undefined ? <Icon name={icon} size={22} /> : null}
      <span className={labelHidden ? 'sr-only' : ''}>{label}</span>
      <span
        aria-hidden="true"
        className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full border-2 border-v7-ink px-0.5 ${
          pressed ? 'bg-v7-cta-2' : 'bg-v7-bg-0'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          data-toggle-knob={pressed ? 'on' : 'off'}
          className={[
            'size-4 rounded-full border-2 border-v7-ink',
            pressed ? 'translate-x-4 bg-v7-text' : 'translate-x-0 bg-v7-text-2',
            reduced ? '' : 'transition-transform duration-(--dur-fast) ease-v7-entrance',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
