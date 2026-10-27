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
import { VERSO_CLASS, VERSO_FRAME_CLASS, VERSO_LIGHT_CLASS, rimLayerClass } from '../card/card-classes';
import { CHROME_FOCUS_CLASS } from '../primitives/chrome-classes';
import { KitPortrait } from './kit-portrait';

function part(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return found;
}

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

function layer(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-kit-layer="${name}"]`);
  if (found === null) {
    throw new Error(`No [data-kit-layer="${name}"]`);
  }
  return found;
}

const classesOf = (node: Element): string[] => (node.getAttribute('class') ?? '').split(' ');

function expectClasses(node: Element, classString: string): void {
  for (const token of classString.split(' ')) {
    expect(classesOf(node)).toContain(token);
  }
}

describe('KitPortrait focus (L72-15 fix round 1)', () => {
  it('uses the shared chrome focus ring on a clickable portrait, never the --cta selection outline', () => {
    renderUi(<KitPortrait kitId="scientific" onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Scientific' });
    expectClasses(button, CHROME_FOCUS_CLASS);
    expectClasses(button, 'min-h-11 min-w-11 cursor-pointer');
    expect(classesOf(button).filter((name) => name.includes('outline-v7-cta'))).toEqual([]);
  });
});

describe('KitPortrait eliminated state (L10-05, L72-15 fix round 1)', () => {
  it('keeps "eliminated" in the name of a clickable portrait', () => {
    renderUi(<KitPortrait kitId="scientific" isEliminated onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Scientific, eliminated' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Scientific' })).toBeNull();
  });

  it('names a clickable Hidden portrait "Hidden kit, eliminated"', () => {
    renderUi(<KitPortrait kitId={null} isEliminated onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Hidden kit, eliminated' })).toBeTruthy();
  });

  it('lets the caller own the name: ariaLabel wins over the composed one', () => {
    renderUi(<KitPortrait kitId="gambler" isEliminated onClick={vi.fn()} ariaLabel="Ana's kit, out" />);
    expect(screen.getByRole('button', { name: "Ana's kit, out" })).toBeTruthy();
  });

  it('adds nothing to the image name of a plain eliminated portrait (spec v7 §11)', () => {
    renderUi(<KitPortrait kitId="scientific" isEliminated />);
    expect(screen.getByRole('img', { name: 'Scientific' })).toBeTruthy();
  });

  it.each([
    [null, 'hidden'],
    ['random', 'random'],
  ] as const)('greys an eliminated %s code face and labels it "Eliminated"', (kitId, face) => {
    const { container } = renderUi(<KitPortrait kitId={kitId} isEliminated />);
    const root = portraitRoot(container);
    expect(root.getAttribute('data-eliminated')).toBe('true');
    expect(root.getAttribute('data-kit-face')).toBe(face);
    expect(root.querySelector('.grayscale')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Eliminated' })).toBeTruthy();
  });

  it('dims the greyscale on the face only, never on the Eliminated badge', () => {
    const { container } = renderUi(<KitPortrait kitId="ghost" isEliminated />);
    const grey = part(container, '.grayscale');
    expect(classesOf(grey)).toContain('brightness-70');
    const badge = layer(container, 'badge');
    expect(grey.contains(badge)).toBe(false);
    expect(classesOf(badge).filter((name) => name === 'grayscale' || name.startsWith('brightness-'))).toEqual([]);
  });

  it.each([
    ['thumb', '9'],
    ['tile', '18'],
    ['sheet', '22'],
    ['hero', '32'],
  ] as const)('sizes the %s badge icon at %s px (about a third of a 40 px face at thumb)', (size, px) => {
    const { container } = renderUi(<KitPortrait kitId="ghost" size={size} isEliminated />);
    expect(part(layer(container, 'badge'), 'svg').getAttribute('width')).toBe(px);
  });
});

describe('KitPortrait sizes (L72-15)', () => {
  it.each([
    ['thumb', 'w-10'],
    ['tile', 'w-18'],
    ['sheet', 'w-24'],
    ['hero', 'w-40'],
  ] as const)('maps size %s to the width class %s at 3:4', (size, widthClass) => {
    const { container } = renderUi(<KitPortrait kitId="scientific" size={size} />);
    const root = portraitRoot(container);
    expect(root.getAttribute('data-kit-size')).toBe(size);
    expect(classesOf(root)).toContain(widthClass);
    expect(classesOf(root)).toContain('aspect-3/4');
  });

  it('defaults to the tile size', () => {
    const { container } = renderUi(<KitPortrait kitId="scientific" />);
    expect(portraitRoot(container).getAttribute('data-kit-size')).toBe('tile');
    expect(classesOf(portraitRoot(container))).toContain('w-18');
  });

  it.each([
    ['thumb', 'text-v7-title'],
    ['tile', 'text-v7-display'],
    ['sheet', 'text-[44px]'],
    ['hero', 'text-[72px]'],
  ] as const)('scales the Hidden "?" at %s with %s', (size, textClass) => {
    const { container } = renderUi(<KitPortrait kitId={null} size={size} />);
    const mark = Array.from(container.querySelectorAll('span')).find(
      (node) => node.childElementCount === 0 && node.textContent === '?',
    );
    expect(mark).toBeDefined();
    expect(mark === undefined ? [] : classesOf(mark)).toContain(textClass);
  });
});

describe('KitPortrait code faces (spec v7 §5.4 hidden verso, L72-15 fix round 1)', () => {
  it.each([null, 'random'] as const)('gives the %s face the card verso tile language', (kitId) => {
    const { container } = renderUi(<KitPortrait kitId={kitId} />);
    expectClasses(layer(container, 'rim'), rimLayerClass('holo'));
    expectClasses(layer(container, 'verso'), VERSO_CLASS);
    expectClasses(layer(container, 'verso-light'), VERSO_LIGHT_CLASS);
    expectClasses(layer(container, 'verso-frame'), VERSO_FRAME_CLASS);
  });

  it('keeps the art faces plain: no rim, verso or frame layer', () => {
    const { container } = renderUi(<KitPortrait kitId="scientific" />);
    for (const name of ['rim', 'verso', 'verso-light', 'verso-frame']) {
      expect(container.querySelector(`[data-kit-layer="${name}"]`)).toBeNull();
    }
  });

  it.each([null, 'random'] as const)('hides the %s code face inside a button from assistive tech', (kitId) => {
    const { container } = renderUi(<KitPortrait kitId={kitId} onClick={vi.fn()} />);
    const face = layer(container, 'face');
    expect(face.getAttribute('aria-hidden')).toBe('true');
    expect(face.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
