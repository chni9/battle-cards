// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { IconButton } from './icon-button';

describe('IconButton (L59-01, technical spec v7 §5.6)', () => {
  it('is a 44 px button named by aria-label and titled with the same text by default', () => {
    renderUi(<IconButton aria-label="Open the action log" icon="log" />);
    const button = screen.getByRole('button', { name: 'Open the action log' });
    expect(button.getAttribute('title')).toBe('Open the action log');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.classList.contains('size-11')).toBe(true);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('title={null} removes the native tooltip and a string replaces it', () => {
    const { rerender } = renderUi(<IconButton aria-label="Menu" icon="menu" title={null} />);
    expect(screen.getByRole('button', { name: 'Menu' }).hasAttribute('title')).toBe(false);
    rerender(<IconButton aria-label="Menu" icon="menu" title="Open the menu" />);
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('title')).toBe('Open the menu');
  });

  it('shows an aria-hidden count badge only when count > 0', () => {
    const { rerender } = renderUi(<IconButton aria-label="Chat, 3 unread" icon="chat" count={3} />);
    expect(screen.getByText('3').getAttribute('aria-hidden')).toBe('true');
    rerender(<IconButton aria-label="Chat" icon="chat" count={0} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('a disabled icon button blocks its handler', async () => {
    const onClick = vi.fn();
    const { user } = renderUi(<IconButton aria-label="Share" icon="share" disabled onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to the quiet variant and drops the press animation under reduced motion', () => {
    renderUi(<IconButton aria-label="Help" icon="help" />, { reducedMotion: true });
    const button = screen.getByRole('button', { name: 'Help' });
    expect(button.getAttribute('data-variant')).toBe('quiet');
    expect(button.getAttribute('data-motion')).toBe('reduced');
    expect(button.className).not.toMatch(/translate/);
  });

  it('className positions the button itself: no relative root to fight', () => {
    renderUi(<IconButton aria-label="Help" icon="help" count={2} className="absolute top-3 right-3" />);
    const button = screen.getByRole('button', { name: 'Help' });
    expect([...button.classList]).toEqual(expect.arrayContaining(['absolute', 'top-3', 'right-3']));
    expect(button.classList.contains('relative')).toBe(false);
  });

  it('aria-disabled keeps focus, shows the off look and drops the press', () => {
    renderUi(<IconButton aria-label="Next" icon="chevron-right" aria-disabled />);
    const button = screen.getByRole('button', { name: 'Next' });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.className).toMatch(/aria-disabled:bg-v7-panel-2/);
    expect(button.className).not.toMatch(/translate/);
  });

  it('wells its icon on a CTA fill and not on quiet (DESIGN.md Icons)', () => {
    const { container, rerender } = renderUi(<IconButton aria-label="Help" icon="help" variant="secondary" />);
    expect(container.querySelector('[data-icon-well] svg')).not.toBeNull();
    rerender(<IconButton aria-label="Help" icon="help" />);
    expect(container.querySelector('[data-icon-well]')).toBeNull();
  });
});
