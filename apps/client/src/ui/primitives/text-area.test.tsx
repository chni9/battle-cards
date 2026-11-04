// @vitest-environment happy-dom
/** TextArea: technical spec v7 §5.2 (16 px, no iOS zoom), §7.7 (the Feedback message); L76-07. */
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { TextArea } from './text-area';

function descriptions(element: Element): (string | null | undefined)[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent);
}

describe('TextArea (technical spec v7 §5.2; L76-07)', () => {
  it('labels a 16 px multi-line field and forwards its ref and attributes', () => {
    const ref = createRef<HTMLTextAreaElement>();
    renderUi(<TextArea label="Message" ref={ref} maxLength={4000} rows={4} placeholder="What was unclear?" />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(ref.current).toBe(field);
    expect(field.tagName).toBe('TEXTAREA');
    expect([...field.classList]).toEqual(expect.arrayContaining(['text-v7-input', 'min-h-28']));
    expect([field.getAttribute('maxlength'), field.getAttribute('rows'), field.getAttribute('placeholder')]).toEqual(['4000', '4', 'What was unclear?']);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });

  it('describes the hint and the error, and marks the error invalid', () => {
    const { rerender } = renderUi(<TextArea label="Message" hint="Up to 4000 characters" error="Write a few words" />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(descriptions(field)).toEqual(['Up to 4000 characters', 'Write a few words']);
    rerender(<TextArea label="Message" hint="Up to 4000 characters" error={null} />);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
    expect(descriptions(field)).toEqual(['Up to 4000 characters']);
  });

  it('keeps the name when the label is hidden from sight', () => {
    renderUi(<TextArea label="Message" labelHidden />);
    const label = screen.getByText('Message');
    expect(label.classList.contains('sr-only')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy();
  });
});
