/**
 * Labelled multi-line text field (technical spec v7 §5.2, §7.7: the Feedback message). It exists
 * because `TextField` renders an `<input>` only and its props and ref are typed for one; a
 * `multiline` union there would widen them. Everything else mirrors `TextField`: 16 px text so
 * iOS never zooms on focus, the same chrome on `--panel-2`, the hint and the error joined to the
 * caller's `aria-describedby`, `aria-invalid` with a `--danger` border on an error, and the error
 * inside a polite live region that is always present. The error words stay `--text` (`--danger`
 * text fails AA at this size). A 112 px minimum height and a vertical resize handle. L76-07.
 */

import { useId, type ReactElement, type Ref, type TextareaHTMLAttributes } from 'react';
import { CHROME_FLAT_SM_CLASS, CHROME_FOCUS_CLASS } from './chrome-classes';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'children'> {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string | null;
  /** Lands on the wrapper, as TextField's. */
  className?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  labelHidden = false,
  hint,
  error = null,
  className,
  ref,
  id,
  'aria-describedby': callerDescribedBy,
  ...textAreaProps
}: TextAreaProps): ReactElement {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const hasHint = hint !== undefined && hint !== '';
  const hasError = error !== null && error !== '';
  const describedBy = [callerDescribedBy, hasHint ? hintId : undefined, hasError ? errorId : undefined]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');

  return (
    <div className={`flex min-w-0 flex-col ${className ?? ''}`}>
      <label
        htmlFor={fieldId}
        className={labelHidden ? 'sr-only' : 'mb-1 font-v7-body text-v7-body font-extrabold text-v7-text'}
      >
        {label}
      </label>
      <textarea
        {...textAreaProps}
        ref={ref}
        id={fieldId}
        {...(describedBy !== '' ? { 'aria-describedby': describedBy } : {})}
        {...(hasError ? { 'aria-invalid': true } : {})}
        className={[
          'min-h-28 w-full min-w-0 resize-y px-3 py-2 font-v7-body text-v7-input font-bold text-v7-text',
          'placeholder:text-v7-text-2 placeholder:opacity-70',
          CHROME_FLAT_SM_CLASS,
          'bg-v7-panel-2',
          'aria-invalid:border-v7-danger disabled:cursor-not-allowed disabled:opacity-50',
          CHROME_FOCUS_CLASS,
        ].join(' ')}
      />
      {hasHint ? (
        <p id={hintId} className="mt-1 font-v7-body text-v7-caption font-bold text-v7-text-2">
          {hint}
        </p>
      ) : null}
      <div aria-live="polite">
        {hasError ? (
          <p id={errorId} className="mt-1 font-v7-body text-v7-caption font-extrabold text-v7-text">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
