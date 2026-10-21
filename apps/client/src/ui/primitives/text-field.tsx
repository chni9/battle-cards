/**
 * Labelled text input (technical spec v7 §5.2): 16 px text so iOS never zooms on focus
 * (commit 6372d04) and a 44 px touch height. The hint and the error join the caller's
 * `aria-describedby`; an error also sets `aria-invalid` and turns the border `--danger`.
 *
 * The error words stay `--text`: `--danger` text is 4.38:1 on `--panel-2` (spec v7 §5.1
 * resource and threat colors are text only at large size), so the border marks the field and
 * the words carry the message.
 */

import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from 'react';
import { CHROME_FOCUS_CLASS } from './chrome-classes';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'children'> {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  labelHidden = false,
  hint,
  error = null,
  className,
  ref,
  id,
  type = 'text',
  'aria-describedby': callerDescribedBy,
  ...inputProps
}: TextFieldProps): ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hasHint = hint !== undefined && hint !== '';
  const hasError = error !== null && error !== '';
  const describedBy = [callerDescribedBy, hasHint ? hintId : undefined, hasError ? errorId : undefined]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className ?? ''}`}>
      <label
        htmlFor={inputId}
        className={labelHidden ? 'sr-only' : 'font-v7-body text-v7-body font-extrabold text-v7-text'}
      >
        {label}
      </label>
      <input
        {...inputProps}
        ref={ref}
        id={inputId}
        type={type}
        {...(describedBy !== '' ? { 'aria-describedby': describedBy } : {})}
        {...(hasError ? { 'aria-invalid': true } : {})}
        className={[
          'min-h-11 w-full min-w-0 px-3 font-v7-body text-v7-input font-bold text-v7-text placeholder:text-v7-text-2',
          'rounded-v7-chrome-sm border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel-2',
          'aria-invalid:border-v7-danger disabled:cursor-not-allowed disabled:opacity-50',
          CHROME_FOCUS_CLASS,
        ].join(' ')}
      />
      {hasHint ? (
        <p id={hintId} className="font-v7-body text-v7-caption font-bold text-v7-text-2">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="font-v7-body text-v7-caption font-extrabold text-v7-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
