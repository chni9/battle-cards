/**
 * Segmented control with real radio semantics (technical spec v7 §11, Q7; WAI-ARIA APG radio
 * group): a labelled `radiogroup` of `aria-checked` radios. The checked radio, or the first
 * enabled one, is the only Tab stop; arrow keys on both axes move focus and select, wrapping
 * and skipping disabled options. `disabled` locks the whole group (`aria-disabled`).
 *
 * Values may be strings or numbers and reach `onChange` unchanged.
 */

import { useRef, type KeyboardEvent, type ReactElement } from 'react';
import {
  CHROME_TRACK_CLASS,
  CHROME_TRACK_IDLE_CLASS,
  CHROME_TRACK_ITEM_CLASS,
  CHROME_TRACK_SELECTED_CLASS,
  CHROME_TRACK_SELECTED_LOCKED_CLASS,
} from './chrome-classes';
import { edgeEnabledIndex, hasCommandModifier, nextEnabledIndex, rovingKeyFor } from './roving-focus';

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SegmentedProps<T extends string | number> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedProps<T>): ReactElement {
  const groupRef = useRef<HTMLDivElement>(null);
  const optionDisabled = options.map((option) => disabled || option.disabled === true);
  const checkedIndex = options.findIndex((option) => option.value === value);
  const tabStop =
    checkedIndex >= 0 && optionDisabled[checkedIndex] !== true
      ? checkedIndex
      : edgeEnabledIndex(optionDisabled, 'first');

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (hasCommandModifier(event)) return;
    const key = rovingKeyFor(event.key, 'radios');
    if (key === null) return;
    event.preventDefault();
    const target = nextEnabledIndex(optionDisabled, index, key === 'next' ? 1 : -1);
    const option = options[target];
    if (target === index || option === undefined) return;
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[target]?.focus();
    onChange(option.value);
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      {...(disabled ? { 'aria-disabled': true } : {})}
      className={CHROME_TRACK_CLASS}
    >
      {options.map((option, index) => {
        const checked = index === checkedIndex;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={optionDisabled[index] === true}
            onClick={() => {
              if (!checked) onChange(option.value);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
            className={`${CHROME_TRACK_ITEM_CLASS} min-w-11 flex-1 px-3 ${
              checked
                ? optionDisabled[index] === true
                  ? CHROME_TRACK_SELECTED_LOCKED_CLASS
                  : CHROME_TRACK_SELECTED_CLASS
                : CHROME_TRACK_IDLE_CLASS
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
