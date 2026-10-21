/**
 * Range slider that sends on release (technical spec v7 §7.4, Q4/Q18): the turn-time slider
 * reports live values through `onChange` for its readout and calls `onCommit` once per gesture,
 * so the host sends one `setLobbyRules` intent instead of one per step.
 *
 * A commit happens on a `document` pointerup or pointercancel after a pointerdown, on keyup
 * after a step key, on blur, or on a native `change` that arrives outside any drag or key
 * press (assistive technology). It is skipped when the value equals the latest known value:
 * the last commit, or the `value` prop once that prop changed after it (even back to an old
 * value: each new prop bumps a version the commit records). So the browser's
 * trailing `change` never commits twice, and a release that keeps the value commits nothing.
 * `value` is the committed value; do not feed `onChange` back into it.
 */

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { CHROME_FOCUS_CLASS } from './chrome-classes';

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange?: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

const STEP_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

// The track and thumb are drawn per engine; box-border keeps the -mt-2 centering exact.
const RANGE_CLASS = [
  'h-11 w-full cursor-pointer appearance-none rounded-v7-chrome-sm bg-transparent disabled:cursor-not-allowed disabled:opacity-60',
  '[&::-webkit-slider-runnable-track]:box-border [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:border-2 [&::-webkit-slider-runnable-track]:border-v7-ink [&::-webkit-slider-runnable-track]:bg-v7-bg-0',
  '[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-(length:--chrome-outline-width) [&::-webkit-slider-thumb]:border-v7-ink [&::-webkit-slider-thumb]:bg-v7-cta disabled:[&::-webkit-slider-thumb]:bg-v7-text-2',
  '[&::-moz-range-track]:box-border [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-2 [&::-moz-range-track]:border-v7-ink [&::-moz-range-track]:bg-v7-bg-0',
  '[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-(length:--chrome-outline-width) [&::-moz-range-thumb]:border-v7-ink [&::-moz-range-thumb]:bg-v7-cta disabled:[&::-moz-range-thumb]:bg-v7-text-2',
  CHROME_FOCUS_CLASS,
].join(' ');

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange: onLiveChange,
  onCommit,
  disabled = false,
  formatValue,
}: SliderProps): ReactElement {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [shownValue, setShownValue] = useState(value);
  const [propVersion, setPropVersion] = useState(0);
  // Render-time sync: a new committed value replaces the draft (react.dev "You Might Not Need an Effect").
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(value);
    setPropVersion((version) => version + 1);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const pointerActive = useRef(false);
  const keyActive = useRef(false);
  const lastCommit = useRef<{ readonly value: number; readonly propVersion: number } | null>(null);

  function commit(): void {
    const input = inputRef.current;
    if (input === null) return;
    const next = Number(input.value);
    // A prop that arrived after the last commit, even one equal to an older prop, is newer news.
    const latest =
      lastCommit.current !== null && lastCommit.current.propVersion === propVersion ? lastCommit.current.value : value;
    if (next === latest) return;
    lastCommit.current = { value: next, propVersion };
    onCommit(next);
  }

  const onPointerEnd = useEffectEvent(() => {
    if (!pointerActive.current) return;
    pointerActive.current = false;
    commit();
  });
  const onNativeChange = useEffectEvent(() => {
    if (pointerActive.current || keyActive.current) return;
    commit();
  });

  useEffect(() => {
    const listener = (): void => {
      onPointerEnd();
    };
    document.addEventListener('pointerup', listener);
    document.addEventListener('pointercancel', listener);
    return () => {
      document.removeEventListener('pointerup', listener);
      document.removeEventListener('pointercancel', listener);
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    const listener = (): void => {
      onNativeChange();
    };
    input.addEventListener('change', listener);
    return () => {
      input.removeEventListener('change', listener);
    };
  }, []);

  const readout = formatValue !== undefined ? formatValue(draft) : String(draft);

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-v7-body text-v7-body font-extrabold text-v7-text">
          {label}
        </label>
        <span
          aria-hidden="true"
          className={`font-v7-display text-v7-title leading-none ${disabled ? 'text-v7-text-2' : 'text-v7-text'}`}
        >
          {readout}
        </span>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        {...(formatValue !== undefined ? { 'aria-valuetext': readout } : {})}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          setDraft(next);
          onLiveChange?.(next);
        }}
        onPointerDown={() => {
          pointerActive.current = true;
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (STEP_KEYS.has(event.key)) keyActive.current = true;
        }}
        onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
          if (!keyActive.current || !STEP_KEYS.has(event.key)) return;
          keyActive.current = false;
          commit();
        }}
        onBlur={() => {
          pointerActive.current = false;
          keyActive.current = false;
          commit();
        }}
        className={RANGE_CLASS}
      />
    </div>
  );
}
