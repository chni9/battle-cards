// @vitest-environment happy-dom
/** EffectTextWithIcons — technical spec v7 §6.6.1 (L72-11). */
import { SHARED_CARD_CATALOG, SPECIAL_CARD_CATALOG } from '@card-battle/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { glyphRoots, spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { EffectTextWithIcons } from './effect-text-with-icons';

const S = SHARED_CARD_CATALOG;
const X = SPECIAL_CARD_CATALOG;

function expectGlyphs(text: string, visible: string, spoken: string[], icons: string[]): HTMLElement {
  const root = renderUi(<p><EffectTextWithIcons text={text} /></p>).container;
  expect(visibleText(root)).toBe(visible);
  expect(spokenTexts(root)).toEqual(spoken);
  expect(glyphRoots(root).map((node) => node.getAttribute('data-glyph-icon'))).toEqual(icons);
  return root;
}

describe('EffectTextWithIcons (L72-11)', () => {
  it('renders "4 lives" and "3 points" as icon + number with spoken text', () => {
    expectGlyphs(S.regeneration.effect, 'Buy up to 4 at 3 each.', ['4 lives', '3 pts'], ['life', 'point']);
  });
  it('renders "2 upgrade points" as its own glyph, matched before points', () => {
    expectGlyphs(X.cloning.upgradeAdds, 'Also gain 10, 2, and 4 (life cap applies).',
      ['10 pts', '2 upgrade points', '4 lives'], ['point', 'upgrade', 'life']);
  });
  it('renders "4 shield points" with a spoken shield amount', () => {
    expectGlyphs(S.shield.effect, 'Gain 4, or refill your shield to 4 if one is already up. Only one shield at a time.',
      ['4 shield points'], ['shield']);
    expect(screen.getByTitle('4 shield points')).toBeInstanceOf(HTMLElement);
  });
  it('keeps "instead of " visible before the previous resource glyph', () => {
    expectGlyphs(S.regeneration.upgradeAdds, 'Lives cost 2 each instead of 3.', ['2 pts', '3 pts'], ['point', 'point']);
    expect(screen.getByText('instead of').closest('[aria-hidden="true"]')).toBeNull();
  });
  it('leaves damage, turn counts and card lives as plain prose', () => {
    for (const text of [S['basic-attack'].upgradeAdds, X.block.upgradeAdds, X.roulette.effect, X['mega-attack'].effect]) {
      expect(expectGlyphs(text, text, [], []).querySelectorAll('svg')).toHaveLength(0);
    }
  });
});
