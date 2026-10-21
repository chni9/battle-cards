/**
 * Segmented control with real radio semantics (technical spec v7 §11, Q7; WAI-ARIA APG radio
 * group): a labelled `radiogroup` of `aria-checked` radios. The checked radio, or the first
 * enabled one, is the only Tab stop; arrow keys on both axes move focus and select, wrapping
 * and skipping disabled options. `disabled` locks the whole group (`aria-disabled`).
 *
 * Values may be strings or numbers and reach `onChange` unchanged.
 */

import { useRef, type KeyboardEvent, type ReactElement } from 'react';
import { CHROME_FOCUS_CLASS } from './chrome-classes';
import { edgeEnabledIndex, nextEnabledIndex, rovingKeyFor } from './roving-focus';

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
      className="inline-flex max-w-full gap-1 rounded-v7-chrome border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel p-1"
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
            className={[
              'min-h-11 min-w-11 flex-1 rounded-v7-chrome-sm px-3 font-v7-display text-v7-body leading-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              CHROME_FOCUS_CLASS,
              checked ? 'bg-v7-cta text-v7-text-on-cta' : 'text-v7-text-2 enabled:hover:text-v7-text',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
