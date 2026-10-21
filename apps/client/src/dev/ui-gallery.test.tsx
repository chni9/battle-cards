// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ICON_NAMES } from '../ui/icons/icon-names';
import { UiGallery } from './ui-gallery';

// happy-dom has no visualViewport; the Carousel demos read the layout mode through this hook.
vi.mock('../ui/use-visual-viewport-box', () => ({ useViewportMode: () => 'portrait' }));

const PRIMITIVE_TITLES = [
  'Button',
  'IconButton',
  'Pill',
  'Badge',
  'Avatar',
  'Tabs',
  'Segmented',
  'Slider',
  'Toggle',
  'Tooltip',
  'ScrollArea',
  'TextField',
  'Carousel',
  'KitTile',
];

describe('/dev/ui gallery (technical spec v7 §4.2)', () => {
  it('paints on the opt-in V7 ground with a page title', () => {
    const { container } = renderUi(<UiGallery />);
    expect(screen.getByRole('heading', { level: 1, name: 'UI gallery' })).toBeTruthy();
    expect(container.querySelector('.v7-ground')).not.toBeNull();
  });

  it('scrolls inside its own ground root, because html, body and #root clip (index.css)', () => {
    const { container } = renderUi(<UiGallery />);
    const root = container.firstElementChild;
    expect([...(root?.classList ?? [])]).toEqual(
      // `relative` keeps every sr-only and absolute descendant inside the scroller's clip.
      expect.arrayContaining(['relative', 'v7-ground', 'h-full', 'overflow-y-auto', 'overscroll-contain']),
    );
  });

  it('links every registered section from the nav, sorted by id', () => {
    renderUi(<UiGallery />);
    const nav = screen.getByRole('navigation', { name: 'Gallery sections' });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '');
    expect(hrefs).toEqual(expect.arrayContaining(['#icons', '#primitives']));
    expect(hrefs).toEqual([...hrefs].sort((a, b) => a.localeCompare(b)));
  });

  it('shows every L72-08 primitive', () => {
    renderUi(<UiGallery />);
    const region = screen.getByRole('region', { name: 'Primitives' });
    const titles = within(region)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(expect.arrayContaining(PRIMITIVE_TITLES));
  });

  it('shows the full icon set', () => {
    renderUi(<UiGallery />);
    const region = screen.getByRole('region', { name: 'Icons' });
    for (const name of ICON_NAMES) expect(within(region).getAllByText(name).length).toBeGreaterThan(0);
  });
});
