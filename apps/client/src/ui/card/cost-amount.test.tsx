// @vitest-environment happy-dom
/**
 * CostAmount — technical spec v7 §6.6.1, L72-11. Number plus resource icon with a spoken text,
 * the V7 successor of the V2 `CostDisplay` (L39-04) outcomes.
 */

import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { glyphRoots, spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { CostAmount } from './cost-amount';
import type { GlyphAmount } from './glyph-amount';

const g = (kind: GlyphAmount['kind'], amount: number): GlyphAmount => ({ kind, amount });

function renderAmount(element: ReactElement): HTMLElement {
  const root = glyphRoots(renderUi(element).container)[0];
  if (root === undefined) {
    throw new Error('CostAmount root missing');
  }
  return root;
}

/** The one aria-hidden group a CostAmount draws beside its spoken text (not the icons' own flag). */
function hiddenGroup(root: HTMLElement): Element {
  const group = Array.from(root.children).find((child) => child.getAttribute('aria-hidden') === 'true');
  if (group === undefined) {
    throw new Error('CostAmount aria-hidden group missing');
  }
  return group;
}

/** Icon edge in px as the svg declares it; both attributes must agree. */
function iconPx(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('svg'), (svg) => `${svg.getAttribute('width')}x${svg.getAttribute('height')}`);
}

describe('CostAmount (L72-11)', () => {
  it.each([
    ['4 lives', 'lives', 4, 'life'],
    ['3 pts', 'points', 3, 'point'],
    ['2 upgrade points', 'upgradePoint', 2, 'upgrade'],
    ['4 shield points', 'shield', 4, 'shield'],
  ] as const)('renders %s as the number plus one hidden icon', (spoken, kind, n, icon) => {
    const root = renderAmount(<CostAmount amount={g(kind, n)} />);
    expect([spokenTexts(root), visibleText(root), root.getAttribute('data-glyph-icon'), root.getAttribute('title')])
      .toEqual([[spoken], String(n), icon, spoken]);
    const svgs = root.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    // The icon and the number sit inside the one aria-hidden group; the spoken text does not.
    const group = hiddenGroup(root);
    expect([group.querySelectorAll('svg').length, group.textContent]).toEqual([1, String(n)]);
    const spokenNode = root.querySelector('.sr-only');
    expect(spokenNode).not.toBeNull();
    expect(spokenNode?.closest('[aria-hidden="true"]') ?? null).toBeNull();
  });

  it('renders a per-life rate as number, point icon, slash and life icon', () => {
    const root = renderAmount(<CostAmount amount={g('pointsPerLife', 3)} />);
    expect([spokenTexts(root), visibleText(root), root.getAttribute('data-glyph-icon')])
      .toEqual([['3 pts/life'], '3/', 'point']);
    expect(root.querySelectorAll('svg')).toHaveLength(2);
    const group = hiddenGroup(root);
    expect([group.querySelectorAll('svg').length, group.textContent]).toEqual([2, '3/']);
  });

  it('prefixes the sign glyph and the multiplier, and speaks them', () => {
    for (const [el, visible, spoken] of [
      [<CostAmount amount={g('upgradePoint', 1)} signed="cost" />, '−1', 'minus 1 upgrade point'],
      [<CostAmount amount={g('points', 7)} signed="gain" />, '+7', 'plus 7 pts'],
      [<CostAmount amount={g('points', 4)} multiplier={2} />, '2×4', '2×4 pts'],
    ] as const) {
      const root = renderAmount(el);
      expect([visibleText(root), spokenTexts(root)]).toEqual([visible, [spoken]]);
    }
  });

  it('defaults the tooltip to the spoken amount and accepts an override', () => {
    expect(renderAmount(<CostAmount amount={g('points', 2)} />).getAttribute('title')).toBe('2 pts');
    expect(renderAmount(<CostAmount amount={g('points', 2)} title="Buy price" />).getAttribute('title'))
      .toBe('Buy price');
  });

  it('renders no title with title={null} and keeps the spoken amount (L59-01)', () => {
    const root = renderAmount(<CostAmount amount={g('points', 2)} title={null} />);
    expect([root.hasAttribute('title'), spokenTexts(root)]).toEqual([false, ['2 pts']]);
  });

  it('leaves a named parent button its own name and tooltip (L59-01)', () => {
    renderUi(
      <button type="button" aria-label="Draw" title="Draw">
        <CostAmount amount={g('points', 1)} signed="gain" title={null} />
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Draw' }).querySelectorAll('[title]')).toHaveLength(0);
  });

  it('names an unlabeled parent button with the spoken amount only', () => {
    renderUi(
      <button type="button">
        <CostAmount amount={g('lives', 2)} signed="cost" />
      </button>,
    );
    expect(screen.getByRole('button', { name: 'minus 2 lives' })).toBeInstanceOf(HTMLButtonElement);
    renderUi(
      <button type="button">
        <CostAmount amount={g('points', 3)} />
      </button>,
    );
    expect(screen.getByRole('button', { name: '3 pts' })).toBeInstanceOf(HTMLButtonElement);
    renderUi(
      <button type="button">
        <CostAmount amount={g('pointsPerLife', 3)} />
      </button>,
    );
    expect(screen.getByRole('button', { name: '3 pts/life' })).toBeInstanceOf(HTMLButtonElement);
  });

  it('draws the icon at 14, 16 and 20 px for sm, md and lg, and at 14 by default', () => {
    for (const [size, px] of [['sm', 14], ['md', 16], ['lg', 20]] as const) {
      expect(iconPx(renderAmount(<CostAmount amount={g('lives', 4)} size={size} />))).toEqual([`${String(px)}x${String(px)}`]);
    }
    expect(iconPx(renderAmount(<CostAmount amount={g('lives', 4)} />))).toEqual(['14x14']);
  });

  it('sizes both icons of a per-life rate alike', () => {
    expect(iconPx(renderAmount(<CostAmount amount={g('pointsPerLife', 3)} size="lg" />))).toEqual(['20x20', '20x20']);
  });

  it('adds className to the root and keeps the layout classes', () => {
    const root = renderAmount(<CostAmount amount={g('points', 2)} className="text-v7-text-2 extra" />);
    expect(['text-v7-text-2', 'extra', 'inline-flex', 'whitespace-nowrap'].map((name) => root.classList.contains(name)))
      .toEqual([true, true, true, true]);
    expect(renderAmount(<CostAmount amount={g('points', 2)} />).className).not.toContain('undefined');
  });

  it('shows no prefix for a multiplier of 1, as spokenCost speaks none', () => {
    const root = renderAmount(<CostAmount amount={g('points', 4)} multiplier={1} />);
    expect([visibleText(root), spokenTexts(root), root.getAttribute('title')]).toEqual(['4', ['4 pts'], '4 pts']);
  });
});
