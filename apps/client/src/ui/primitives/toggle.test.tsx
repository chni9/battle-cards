// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Toggle } from './toggle';

const knobOf = (button: HTMLElement) => button.querySelector('[data-toggle-knob]');

describe('Toggle (technical spec v7 §11: aria-pressed selectors)', () => {
  it('is a button with aria-pressed that reports the next state', async () => {
    const onPressedChange = vi.fn();
    const { user, rerender } = renderUi(<Toggle label="Sound" pressed={false} onPressedChange={onPressedChange} />);
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await user.click(button);
    rerender(<Toggle label="Sound" pressed onPressedChange={onPressedChange} />);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await user.click(button);
    expect(onPressedChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shows its state by knob position, not color alone', () => {
    const { rerender } = renderUi(<Toggle label="Sound" pressed={false} onPressedChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(knobOf(button)?.getAttribute('data-toggle-knob')).toBe('off');
    rerender(<Toggle label="Sound" pressed onPressedChange={vi.fn()} />);
    expect(knobOf(button)?.getAttribute('data-toggle-knob')).toBe('on');
  });

  it('labelHidden keeps the accessible name next to a decorative icon', () => {
    renderUi(<Toggle label="Sound" icon="sound" labelHidden pressed={false} onPressedChange={vi.fn()} />);
    expect(screen.getByText('Sound').classList.contains('sr-only')).toBe(true);
    expect(screen.getByRole('button', { name: 'Sound' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('disabled blocks the handler', async () => {
    const onPressedChange = vi.fn();
    const { user } = renderUi(<Toggle label="Sound" pressed={false} disabled onPressedChange={onPressedChange} />);
    await user.click(screen.getByRole('button', { name: 'Sound' }));
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  it('reduced motion moves the knob without a transition', () => {
    renderUi(<Toggle label="Sound" pressed onPressedChange={vi.fn()} />, { reducedMotion: true });
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button.getAttribute('data-motion')).toBe('reduced');
    expect(knobOf(button)?.getAttribute('class')).not.toMatch(/transition/);
  });
});
