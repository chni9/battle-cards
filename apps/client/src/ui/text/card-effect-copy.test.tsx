// @vitest-environment happy-dom
/** CardEffectCopy — technical spec v7 §6.6.1 (L72-11). */
import { SHARED_CARD_CATALOG, type Card } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { glyphRoots, spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { CardEffectCopy } from './card-effect-copy';

const basic = SHARED_CARD_CATALOG['basic-attack'];
const regen = SHARED_CARD_CATALOG.regeneration;

function renderCopy(card: Card, isUpgraded: boolean): HTMLElement {
  return renderUi(<CardEffectCopy card={card} isUpgraded={isUpgraded} />).container;
}

function maybe(root: HTMLElement, name: string): HTMLElement | null {
  return root.querySelector(`[data-effect-part="${name}"]`);
}

function part(root: HTMLElement, name: string): HTMLElement {
  const node = maybe(root, name);
  if (node === null) throw new Error(`missing ${name} part`);
  return node;
}

function spokenIn(root: HTMLElement, name: string): string[] {
  return spokenTexts(part(root, name));
}

describe('CardEffectCopy (L72-11)', () => {
  it('shows Cost, the base effect and the Upgrade block for a base card', () => {
    const root = renderCopy(basic, false);
    expect(within(part(root, 'cost')).getByText('Cost')).toBeInstanceOf(HTMLElement);
    expect(spokenIn(root, 'cost')).toEqual(['1 pt']);
    expect(part(root, 'effect').textContent).toBe('Deal 1 damage to an opponent.');
    expect(visibleText(part(root, 'upgrade'))).toBe('Upgrade — Deal 3 damage instead of 1.');
    expect(screen.queryByText(/Cost:/)).toBeNull();
    expect(screen.queryByText('Choose Use, Upgrade, or Sell.')).toBeNull();
  });
  it('shows upgradeEffect alone for an upgraded card', () => {
    const root = renderCopy(basic, true);
    expect(spokenIn(root, 'cost')).toEqual(['1 pt']);
    expect(part(root, 'effect').textContent).toBe('Deal 3 damage to an opponent.');
    expect([maybe(root, 'upgrade'), screen.queryByText('Upgrade'), screen.queryByText(basic.upgradeAdds)]).toEqual([null, null, null]);
  });
  it('shows Regeneration per-life rates: 3 points per life base, 2 upgraded', () => {
    const base = renderCopy(regen, false);
    expect(spokenIn(base, 'cost')).toEqual(['3 pts/life']);
    expect(glyphRoots(part(base, 'cost'))[0]?.querySelectorAll('svg')).toHaveLength(2);
    expect(spokenIn(base, 'effect')).toEqual(['4 lives', '3 pts']);
    expect(visibleText(part(base, 'upgrade'))).toBe('Upgrade — Lives cost 2 each instead of 3.');
    expect(spokenIn(base, 'upgrade')).toEqual(['2 pts', '3 pts']);
    const up = renderCopy(regen, true);
    expect(spokenIn(up, 'cost')).toEqual(['2 pts/life']);
    expect(visibleText(part(up, 'effect'))).toBe('Buy up to 4 at 2 each.');
    expect(spokenIn(up, 'effect')).toEqual(['4 lives', '2 pts']);
    expect(maybe(up, 'upgrade')).toBeNull();
  });
  it('shows the Tax play cost as 1 life', () => {
    const cost = part(renderCopy(SHARED_CARD_CATALOG.tax, false), 'cost');
    expect(spokenTexts(cost)).toEqual(['1 life']);
    expect(glyphRoots(cost).map((node) => node.getAttribute('data-glyph-icon'))).toEqual(['life']);
  });
  it('speaks "4 shield points" in the Shield effect', () => {
    const root = renderCopy(SHARED_CARD_CATALOG.shield, false);
    expect([spokenIn(root, 'cost'), spokenIn(root, 'effect')]).toEqual([['7 pts'], ['4 shield points']]);
  });
  it('omits the Cost row when the card has no play cost', () => {
    const root = renderCopy({ ...basic, cost: {} }, false);
    expect([maybe(root, 'cost'), screen.queryByText('Cost')]).toEqual([null, null]);
    expect(part(root, 'effect').textContent).toBe(basic.effect);
    expect(maybe(root, 'upgrade')).not.toBeNull();
  });
  it('omits an empty effect paragraph', () => {
    const base = renderCopy({ ...basic, effect: '' }, false);
    expect([maybe(base, 'effect'), maybe(base, 'cost') !== null, maybe(base, 'upgrade') !== null]).toEqual([null, true, true]);
    const up = renderCopy({ ...basic, upgradeEffect: '' }, true);
    expect([maybe(up, 'effect'), maybe(up, 'upgrade')]).toEqual([null, null]);
  });
});
