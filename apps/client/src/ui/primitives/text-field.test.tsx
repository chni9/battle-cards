// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { contrastRatio, WCAG_AA_TEXT } from '../contrast';
import { V7_COLORS } from '../palette';
import { TextField } from './text-field';

/** `placeholder:opacity-70` over the input's own `--panel-2` fill. */
const PLACEHOLDER_OPACITY = 0.7;

function blend(foreground: string, background: string, alpha: number): string {
  const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const back = channels(background);
  return `#${channels(foreground)
    .map((value, index) => Math.round(alpha * value + (1 - alpha) * (back[index] ?? 0)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function descriptions(element: Element): (string | null | undefined)[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent);
}

describe('TextField (technical spec v7 §5.2, commit 6372d04)', () => {
  it('labels a 16 px, 44 px-tall input and forwards its ref', () => {
    const ref = createRef<HTMLInputElement>();
    renderUi(<TextField label="Nickname" name="nickname" ref={ref} />);
    const input = screen.getByRole('textbox', { name: 'Nickname' });
    expect(ref.current).toBe(input);
    expect([...input.classList]).toEqual(expect.arrayContaining(['text-v7-input', 'min-h-11']));
    expect(input.getAttribute('name')).toBe('nickname');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('links the hint through aria-describedby', () => {
    renderUi(<TextField label="Nickname" hint="Shown to other players" />);
    expect(descriptions(screen.getByRole('textbox', { name: 'Nickname' }))).toEqual(['Shown to other players']);
  });

  it('marks an error with aria-invalid and describes it; null clears it', () => {
    const { rerender } = renderUi(<TextField label="Nickname" hint="Shown to other players" error="Pick a nickname" />);
    const input = screen.getByRole('textbox', { name: 'Nickname' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(descriptions(input)).toEqual(['Shown to other players', 'Pick a nickname']);
    rerender(<TextField label="Nickname" hint="Shown to other players" error={null} />);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(descriptions(input)).toEqual(['Shown to other players']);
  });

  it('announces an error politely as it appears', () => {
    const { container, rerender } = renderUi(<TextField label="Nickname" />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('');
    rerender(<TextField label="Nickname" error="Pick a nickname" />);
    expect(container.querySelector('[aria-live="polite"]')).toBe(live);
    expect(live?.textContent).toBe('Pick a nickname');
  });

  it('dims the placeholder but keeps it at 4.5:1 on the input fill', () => {
    renderUi(<TextField label="Join code" placeholder="ABCD" />);
    const input = screen.getByRole('textbox', { name: 'Join code' });
    expect([...input.classList]).toEqual(expect.arrayContaining(['placeholder:text-v7-text-2', 'placeholder:opacity-70']));
    const dimmed = blend(V7_COLORS['text-2'], V7_COLORS['panel-2'], PLACEHOLDER_OPACITY);
    expect(contrastRatio(dimmed, V7_COLORS['panel-2'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it('labelHidden keeps the accessible name', () => {
    renderUi(<TextField label="Message" labelHidden />);
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy();
    expect(screen.getByText('Message').classList.contains('sr-only')).toBe(true);
  });

  it('keeps a caller id and passes input events through', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<TextField label="Join code" id="join-code" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Join code' });
    expect(input.id).toBe('join-code');
    await user.type(input, 'ABC');
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
