// @vitest-environment happy-dom
/** V7 Icon — technical spec v7 §5.6, §5.1, Q45, L72-07. */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { V7_COLORS } from '../palette';
import { Icon, type IconProps } from './icon';
import { ICON_NAMES, RESOURCE_ICON } from './icon-names';

const SHAPES = 'path, circle, ellipse, rect, line, polyline, polygon';
const PALETTE_HEX: ReadonlySet<string> = new Set(Object.values(V7_COLORS));
function svgOf(props: IconProps): SVGSVGElement {
  const svg = renderUi(<Icon {...props} />).container.querySelector('svg');
  if (svg === null) throw new Error('Icon rendered no <svg>');
  return svg;
}
/** Glyph geometry without paint, so two icons cannot differ by color alone. */
const shapeOf = (svg: SVGSVGElement): string => svg.innerHTML.replace(/\s(?:fill|stroke)="[^"]*"/g, '');

describe('Icon (technical spec v7 §5.6)', () => {
  it.each(ICON_NAMES)('renders %s as a non-empty decorative svg', (name) => {
    const svg = svgOf({ name });
    const attrs = ['aria-hidden', 'focusable', 'role', 'aria-label', 'viewBox', 'data-icon'].map((key) => svg.getAttribute(key));
    expect(attrs).toEqual(['true', 'false', null, null, '0 0 24 24', name]);
    expect(svg.querySelector('title')).toBeNull();
    expect(svg.querySelector('text')).toBeNull();
    expect(svg.querySelectorAll(SHAPES).length).toBeGreaterThan(0);
  });
  it('keeps a decorative icon out of the accessibility tree', () => {
    renderUi(<Icon name="life" />);
    expect(screen.queryByRole('img')).toBeNull();
  });
  it.each(ICON_NAMES)('draws %s in the arcade style: 2-unit ink outline, palette paints, a visible body', (name) => {
    const svg = svgOf({ name });
    expect(svg.getAttribute('stroke')).toBe(V7_COLORS.ink);
    expect(svg.getAttribute('stroke-width')).toBe('2');
    for (const element of svg.querySelectorAll('[fill], [stroke]')) {
      for (const paint of [element.getAttribute('fill'), element.getAttribute('stroke')]) {
        if (paint !== null && paint !== 'none') expect(PALETTE_HEX.has(paint), `${name} paints ${paint}`).toBe(true);
      }
    }
    // --ink equals --bg-0, so a glyph drawn only in ink would vanish on the ground.
    const bodies = [...svg.querySelectorAll('[fill]')].map((element) => element.getAttribute('fill'))
      .filter((fill) => fill !== null && fill !== 'none' && fill !== V7_COLORS.ink);
    expect(bodies.length).toBeGreaterThan(0);
  });
  it('gives every name its own shape, not only its own color', () => {
    expect(new Set(ICON_NAMES.map((name) => shapeOf(svgOf({ name })))).size).toBe(ICON_NAMES.length);
  });
  it('draws help and coach as different glyphs (Q45)', () => {
    expect(shapeOf(svgOf({ name: 'help' }))).not.toBe(shapeOf(svgOf({ name: 'coach' })));
  });
  it.each([
    ['life', V7_COLORS.life], ['point', V7_COLORS.point], ['upgradePoint', V7_COLORS.upgrade], ['shield', V7_COLORS.shield],
  ] as const)('fills the %s resource icon with its own token (§5.1)', (kind, hex) => {
    expect(svgOf({ name: RESOURCE_ICON[kind] }).querySelector(`[fill="${hex}"]`)).not.toBeNull();
  });
  it('renders 20 px by default and honours size', () => {
    const size = (svg: SVGSVGElement) => [svg.getAttribute('width'), svg.getAttribute('height')];
    expect(size(svgOf({ name: 'menu' }))).toEqual(['20', '20']);
    expect(size(svgOf({ name: 'menu', size: 32 }))).toEqual(['32', '32']);
  });
  it('passes className to the svg', () => {
    expect(svgOf({ name: 'menu', className: 'shrink-0' }).getAttribute('class')).toBe('shrink-0');
  });
  it('exposes a labelled icon as an image named by its label, with a matching title', () => {
    renderUi(<Icon name="spying-on-you" label="Icon fixture label" />);
    const image = screen.getByRole('img', { name: 'Icon fixture label' });
    expect(image.tagName.toLowerCase()).toBe('svg');
    expect(image.getAttribute('aria-hidden')).toBeNull();
    expect(image.querySelector('title')?.textContent).toBe('Icon fixture label');
  });
  it('treats an empty label as decorative, never as an unnamed image', () => {
    const svg = svgOf({ name: 'help', label: '' });
    expect([svg.getAttribute('aria-hidden'), svg.getAttribute('role')]).toEqual(['true', null]);
    expect(svg.querySelector('title')).toBeNull();
  });
});
