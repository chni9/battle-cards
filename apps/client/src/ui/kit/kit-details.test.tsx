// @vitest-environment happy-dom
/**
 * KitDetails — technical spec v7 §6.6.5 (the kit sheet shows every current section), §5.5
 * (kit values come from `KIT_CATALOG`, never from the art), §7.3 (kit picker) and §11 (portrait
 * `alt` = kit name). Appendix A: `kit-inspect-dialog`, `lobby-kit-picker-dialog`,
 * `home-solo-kit-picker`. This is the component test that the L30-05 and L51-04 classification
 * rows of `screens/table/kit-inspect-dialog.test.ts` ask for: every kit renders every
 * `KIT_TRAIT_SECTION_KEYS` section, the starting hand is versos with counts and no "action ·
 * attack" prose, and the Draw, buy/sell and special costs are drawn and spoken as glyphs.
 */

import { KIT_CATALOG, KIT_IDS, getCard, getKit, upgradePointBuyCost, upgradePointSellYield } from '@card-battle/shared';
import type { CardId, KitId } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { KIT_ABILITY_COPY, KIT_TRAIT_SECTION_KEYS } from '../../view-model/kit-inspect-traits';
import { kitSpecialCardKey } from '../../view-model/kit-special-card-key';
import { HIDDEN_CARD_LABEL, cardCostChip, cardDamageChip, cardFaceLabel } from '../card/card-face';
import { spokenGlyphAmount } from '../card/glyph-amount';
import { KIT_DETAILS_SECTION_IDS, KIT_DETAILS_SECTION_TITLES, KIT_TRAIT_SECTION_FOR } from './kit-details-sections';
import type { KitDetailsSectionId } from './kit-details-sections';
import { KitDetails } from './kit-details';

function section(container: ParentNode, id: KitDetailsSectionId): HTMLElement {
  const found = container.querySelector<HTMLElement>(`[data-kit-section="${id}"]`);
  if (found === null) {
    throw new Error(`No [data-kit-section="${id}"]`);
  }
  return found;
}

function part(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return found;
}

/** The number stands alone in the text: "10" matches "10Lives 10", "1" does not match "10". */
function expectNumber(text: string, n: number): void {
  expect(text).toMatch(new RegExp(`(^|\\D)${String(n)}(\\D|$)`));
}

function expectedSections(kitId: KitId): KitDetailsSectionId[] {
  return KIT_DETAILS_SECTION_IDS.filter((id) => id !== 'ability' || KIT_ABILITY_COPY[kitId] !== undefined);
}

function traitCardName(cardId: CardId, up: boolean): string {
  return cardFaceLabel({
    name: getCard(cardId)?.name ?? cardId,
    isUpgraded: up,
    damage: cardDamageChip(cardId, up),
  });
}

function sectionIds(container: ParentNode): (string | null)[] {
  return Array.from(container.querySelectorAll('[data-kit-section]'), (node) => node.getAttribute('data-kit-section'));
}

function instanceIds(root: ParentNode): (string | null)[] {
  return Array.from(root.querySelectorAll('[data-instance-id]'), (node) => node.getAttribute('data-instance-id'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('KitDetails for every kit (spec v7 §6.6.5, L30-05)', () => {
  it.each(KIT_IDS)('renders every section in order with its title for %s', (kitId) => {
    const { container } = renderUi(<KitDetails kitId={kitId} />);
    expect(sectionIds(container)).toEqual(expectedSections(kitId));
    for (const id of expectedSections(kitId)) {
      expect(within(section(container, id)).getByRole('heading', { name: KIT_DETAILS_SECTION_TITLES[id] })).toBeTruthy();
    }
    for (const key of KIT_TRAIT_SECTION_KEYS) {
      expect(section(container, KIT_TRAIT_SECTION_FOR[key])).toBeTruthy();
    }
  });

  it.each(KIT_IDS)('shows the KIT_CATALOG starting values for %s (spec v7 §5.5)', (kitId) => {
    const { container } = renderUi(<KitDetails kitId={kitId} />);
    const { lives, points, upgradePoints, draw } = KIT_CATALOG[kitId].startingResources;
    const counts = KIT_CATALOG[kitId].startingCardCounts;
    const resources = section(container, 'starting-resources');
    expectNumber(part(resources, '[data-resource-kind="life"]').textContent, lives);
    expectNumber(part(resources, '[data-resource-kind="point"]').textContent, points);
    expectNumber(part(resources, '[data-resource-kind="upgradePoint"]').textContent, upgradePoints);
    expect(part(resources, '[data-kit-stat="draw"]').textContent).toContain(
      spokenGlyphAmount({ kind: 'points', amount: draw }, { signed: 'gain' }),
    );
    const hand = section(container, 'starting-hand');
    expect(part(hand, '[data-hand-family="action"]').textContent).toContain(`×${String(counts.action)}`);
    expect(part(hand, '[data-hand-family="attack"]').textContent).toContain(`×${String(counts.attack)}`);
  });

  it.each(KIT_IDS)('renders versos, specials and trait cards as Card faces for %s', (kitId) => {
    const { container } = renderUi(<KitDetails kitId={kitId} />);
    const kit = getKit(kitId);

    const hand = section(container, 'starting-hand');
    expect(within(hand).getAllByRole('article', { name: HIDDEN_CARD_LABEL })).toHaveLength(2);
    expect(hand.textContent).not.toMatch(/·/);

    const specials = section(container, 'special-cards');
    const keys = kit.specialCards.map((cardId, index) => kitSpecialCardKey(cardId, index));
    expect(instanceIds(specials)).toEqual(keys);
    kit.specialCards.forEach((cardId, index) => {
      const cost = cardCostChip(cardId, false);
      expect(cost).not.toBeNull();
      if (cost !== null) {
        expect(part(specials, `[data-special-key="${kitSpecialCardKey(cardId, index)}"]`).textContent).toContain(
          spokenGlyphAmount(cost, { signed: 'cost' }),
        );
      }
    });

    const groups = [
      ['always-upgraded', kit.traits.alwaysUpgraded, true],
      ['immune-to', kit.traits.immuneTo, false],
    ] as const;
    for (const [id, cardIds, upgraded] of groups) {
      const group = section(container, id);
      if (cardIds.length === 0) {
        expect(group.textContent).toContain('None');
        expect(within(group).queryAllByRole('article')).toEqual([]);
      } else {
        expect(within(group).getAllByRole('article')).toHaveLength(cardIds.length);
        for (const cardId of cardIds) {
          expect(within(group).getByRole('article', { name: traitCardName(cardId, upgraded) })).toBeTruthy();
        }
      }
    }
    // The details are read-only content: no face is a button, the sheet around them owns Select.
    expect(container.querySelector('button')).toBeNull();
  });

  it.each(KIT_IDS)('states attacks per turn, prices, draw risk and ability for %s', (kitId) => {
    const { container } = renderUi(<KitDetails kitId={kitId} />);
    const { traits } = getKit(kitId);

    expect(section(container, 'attacks-per-turn').textContent).toContain(
      traits.allowsMultipleAttacksPerTurn ? 'May play several attack cards as one action' : 'One attack card per action',
    );

    const prices = section(container, 'upgrade-points');
    expect(part(prices, '[data-kit-stat="upgrade-point-buy"]').textContent).toContain(
      spokenGlyphAmount({ kind: 'points', amount: upgradePointBuyCost(kitId) }, { signed: 'cost' }),
    );
    expect(part(prices, '[data-kit-stat="upgrade-point-sell"]').textContent).toContain(
      spokenGlyphAmount({ kind: 'points', amount: upgradePointSellYield(kitId) }, { signed: 'gain' }),
    );

    expect(section(container, 'draw-risk').textContent).toContain(
      traits.drawBustDenominator === undefined
        ? 'None'
        : `1 in ${String(traits.drawBustDenominator)} chance each Draw`,
    );

    const ability = KIT_ABILITY_COPY[kitId];
    if (ability !== undefined) {
      expect(section(container, 'ability').textContent).toContain(ability);
    }
  });
});

describe('KitDetails spec values', () => {
  it('shows Scientific with versos, the Cloning cost and default prices (L51-04)', () => {
    const { container } = renderUi(<KitDetails kitId="scientific" />);
    expect(screen.getByRole('img', { name: 'Scientific' })).toBeTruthy();
    expect(part(container, '[data-kit-name]').textContent).toBe('Scientific');

    const hand = section(container, 'starting-hand');
    expect(part(hand, '[data-hand-family="action"]').textContent).toContain('×5');
    expect(part(hand, '[data-hand-family="attack"]').textContent).toContain('×2');
    expect(hand.textContent).not.toMatch(/\d+ action · \d+ attack/i);

    expect(part(section(container, 'starting-resources'), '[data-kit-stat="draw"]').textContent).toContain('plus 1 pt');

    const specials = section(container, 'special-cards');
    expect(within(specials).getByRole('article', { name: 'Cloning' })).toBeTruthy();
    expect(within(specials).getByText('Cloning')).toBeTruthy();
    expect(specials.textContent).toContain('minus 3 pts');

    const prices = section(container, 'upgrade-points');
    expect(part(prices, '[data-kit-stat="upgrade-point-buy"]').textContent).toContain('minus 10 pts');
    expect(part(prices, '[data-kit-stat="upgrade-point-sell"]').textContent).toContain('plus 7 pts');

    const upgraded = section(container, 'always-upgraded');
    expect(within(upgraded).getByRole('article', { name: 'Spy upgraded' })).toBeTruthy();
    expect(within(upgraded).getByText('Spy')).toBeTruthy();
    expect(section(container, 'immune-to').textContent).toContain('None');
    expect(section(container, 'draw-risk').textContent).toContain('None');
    expect(container.querySelector('[data-kit-section="ability"]')).toBeNull();
  });

  it("renders each of Specialist's duplicate specials with its own key (L27-05)", () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = renderUi(<KitDetails kitId="specialist" />);
    const specials = section(container, 'special-cards');
    expect(within(specials).getAllByRole('article', { name: 'Card Transformer' })).toHaveLength(2);
    expect(within(specials).getAllByRole('article', { name: 'Card Thief' })).toHaveLength(1);
    expect(within(specials).getAllByRole('article', { name: 'Super Absorber' })).toHaveLength(1);
    expect(instanceIds(specials)).toEqual([
      'card-transformer:0',
      'card-transformer:1',
      'card-thief:2',
      'super-absorber:3',
    ]);
    expect(
      errors.mock.calls.filter((call) => call.some((arg) => typeof arg === 'string' && /same key/i.test(arg))),
    ).toEqual([]);
    // Nothing else logged either: a React warning here would be a real defect, not noise.
    expect(errors).not.toHaveBeenCalled();
  });

  it('renders Gambler from KIT_CATALOG, never from the kit PNG (spec v7 §5.5)', () => {
    expect(KIT_CATALOG.gambler.startingResources).toEqual({ lives: 1, points: 0, upgradePoints: 0, draw: 10 });
    expect(KIT_CATALOG.gambler.startingCardCounts).toEqual({ action: 0, attack: 0 });

    const { container } = renderUi(<KitDetails kitId="gambler" />);
    const resources = section(container, 'starting-resources');
    expectNumber(part(resources, '[data-resource-kind="life"]').textContent, 1);
    expectNumber(part(resources, '[data-resource-kind="point"]').textContent, 0);
    expectNumber(part(resources, '[data-resource-kind="upgradePoint"]').textContent, 0);
    expect(part(resources, '[data-kit-stat="draw"]').textContent).toContain('plus 10 pts');

    const hand = section(container, 'starting-hand');
    expect(part(hand, '[data-hand-family="action"]').textContent).toContain('×0');
    expect(part(hand, '[data-hand-family="attack"]').textContent).toContain('×0');

    const specials = section(container, 'special-cards');
    expect(within(specials).getByRole('article', { name: 'Roulette' })).toBeTruthy();
    expect(specials.textContent).toContain('minus 10 pts');
    expect(section(container, 'draw-risk').textContent).toContain(
      '1 in 10 chance each Draw drops this player to 1 life, 0 points, 0 upgrade points, and no shield',
    );
    expect(section(container, 'ability').textContent).toContain('Each Draw has a 1-in-10 chance');
  });

  it('uses the Upgrader price overrides (L27-01)', () => {
    const { container } = renderUi(<KitDetails kitId="upgrader" />);
    const prices = section(container, 'upgrade-points');
    expect(part(prices, '[data-kit-stat="upgrade-point-buy"]').textContent).toContain('minus 5 pts');
    expect(part(prices, '[data-kit-stat="upgrade-point-sell"]').textContent).toContain('plus 7 pts');
  });

  it('shows "None" for every empty trait group (Kamikaze)', () => {
    const { container } = renderUi(<KitDetails kitId="kamikaze" />);
    expect(section(container, 'always-upgraded').textContent).toContain('None');
    expect(section(container, 'immune-to').textContent).toContain('None');
    expect(section(container, 'draw-risk').textContent).toContain('None');
    expect(section(container, 'attacks-per-turn').textContent).toContain('One attack card per action');
  });
});
