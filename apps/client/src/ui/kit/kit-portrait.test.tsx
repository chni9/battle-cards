// @vitest-environment happy-dom
/**
 * KitPortrait — technical spec v7 §5.5 (extracted art only, kit values from the catalog), §11
 * (portrait `alt` = kit name) and §6.6.5 (a kit portrait is a tappable control). Appendix A:
 * `global-art-catalog`, `global-dialog-button-primitives` (KitPortrait becomes a button when
 * `onClick` is set), L10-05 (eliminated: greyscale plus a badge, no per-kit dead art).
 */

import { KIT_IDS, getKit } from '@card-battle/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { artFor } from '../asset-lookup';
import { KitPortrait } from './kit-portrait';

function portraitRoot(container: ParentNode): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-zone="kit-portrait"]');
  if (root === null) {
    throw new Error('No [data-zone="kit-portrait"] root');
  }
  return root;
}

describe('KitPortrait (spec v7 §5.5, §11)', () => {
  it.each(KIT_IDS)('draws the extracted art for %s with alt = kit name', (kitId) => {
    const { container } = renderUi(<KitPortrait kitId={kitId} />);
    const art = screen.getByRole('img', { name: getKit(kitId).name });
    const src = art.getAttribute('src');
    expect(src).toBe(artFor(kitId));
    expect(src).toMatch(new RegExp(`/art/kits/${kitId}\\.png$`));
    expect(src).not.toMatch(/\(dead\)/i);
    expect(portraitRoot(container).getAttribute('data-kit-face')).toBe('art');
  });

  it('renders a code face named "Hidden kit" for an unrevealed kit', () => {
    const { container } = renderUi(<KitPortrait kitId={null} />);
    expect(screen.getByRole('img', { name: 'Hidden kit' })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(portraitRoot(container).getAttribute('data-kit-face')).toBe('hidden');
  });

  it('renders a distinct code face named "Random kit" for Random', () => {
    const { container } = renderUi(<KitPortrait kitId="random" />);
    expect(screen.getByRole('img', { name: 'Random kit' })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(portraitRoot(container).getAttribute('data-kit-face')).toBe('random');
  });

  it('greys an eliminated portrait and labels it "Eliminated" (L10-05)', () => {
    const { container } = renderUi(<KitPortrait kitId="gambler" isEliminated />);
    const root = portraitRoot(container);
    expect(root.getAttribute('data-eliminated')).toBe('true');
    expect(root.querySelector('.grayscale')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Eliminated' })).toBeTruthy();
  });

  it('keeps a living portrait in colour with no Eliminated badge', () => {
    const { container } = renderUi(<KitPortrait kitId="gambler" />);
    const root = portraitRoot(container);
    expect(root.getAttribute('data-eliminated')).toBe('false');
    expect(root.querySelector('.grayscale')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Eliminated' })).toBeNull();
  });

  it('becomes one button named after the kit when clickable', async () => {
    const onClick = vi.fn();
    const { user } = renderUi(<KitPortrait kitId="scientific" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Scientific' });
    expect(screen.queryByRole('img', { name: 'Scientific' })).toBeNull();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses ariaLabel as the button name when given', () => {
    renderUi(<KitPortrait kitId={null} onClick={vi.fn()} ariaLabel="Ana's kit" />);
    expect(screen.getByRole('button', { name: "Ana's kit" })).toBeTruthy();
  });
});
