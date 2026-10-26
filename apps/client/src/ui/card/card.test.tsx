// @vitest-environment happy-dom
/**
 * Holo Card — technical spec v7 §5.4 (anatomy, families, states, sizes), §5.5 (base drawings
 * only), §6.6.5 (every face is a button, long-press is ours) and §8.3 (reduced motion keeps the
 * same numbers and labels). Appendix A: `global-card-face`, `global-activated-art-guard`,
 * `global-art-lot63-gambler-roulette`, `active-persistent-thumbs`, `sentence-chips`.
 */

import type { Card as CatalogCard, CardId, CardInstance, CardType } from '@card-battle/shared';
import { getCard } from '@card-battle/shared';
import { fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { ALL_ART_CARD_IDS, CARDS_WITH_ACTIVATED_ART, artFor } from '../asset-lookup';
import { Card } from './card';
import { CARD_SIZES, HIDDEN_CARD_LABEL, type CardCounterKind } from './card-face';

const FAMILIES: readonly CardType[] = ['attack', 'action', 'special'];
const UP = '[data-card-face="up"]';
const inst = (cardId: CardId, isUpgraded = false): CardInstance => ({ instanceId: `inst-${cardId}`, cardId, isUpgraded });
const classes = (node: HTMLElement) => node.className.split(' ');
const motionClasses = (node: HTMLElement) =>
  classes(node).filter((n) => n.includes('translate') || n.startsWith('scale-'));

function el(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return found;
}

function catalogCard(cardId: CardId): CatalogCard {
  const card = getCard(cardId);
  if (card === undefined) {
    throw new Error(`No catalog card ${cardId}`);
  }
  return card;
}

const upgradedSuffix = (isUpgraded: boolean): string => (isUpgraded ? ' upgraded' : '');

describe('damage chip (spec v7 §5.4, L56-04)', () => {
  it('shows catalog damage × multiplier on every attack, base and upgraded', () => {
    const rows = [
      ['basic-attack', 'Basic attack', 1, 3],
      ['strong-attack', 'Strong attack', 2, 4],
      ['super-attack', 'Super attack', 7, 10],
      ['mega-attack', 'MEGA ATTACK', 20, 20],
    ] as const;
    const { container, getByRole, rerender } = renderUi(<Card size="sheet" instance={inst('basic-attack')} />);
    for (const [cardId, name, base, upgraded] of rows) {
      for (const isUpgraded of [false, true]) {
        for (const damageMultiplier of [1, 2]) {
          rerender(<Card size="sheet" instance={inst(cardId, isUpgraded)} damageMultiplier={damageMultiplier} />);
          const listed = (isUpgraded ? upgraded : base) * damageMultiplier;
          expect(el(container, '[data-card-chip="damage"]').textContent).toBe(String(listed));
          expect(
            getByRole('article', { name: `${name}${upgradedSuffix(isUpgraded)}, ${String(listed)} damage` }),
          ).toBe(el(container, UP));
        }
      }
    }
  });

  it('renders no damage chip on Tax, Absorber and Super Mirror', () => {
    const rows = [
      ['tax', 'Tax'],
      ['absorber', 'Absorber'],
      ['super-mirror', 'Super Mirror'],
    ] as const;
    const { container, rerender } = renderUi(<Card size="sheet" instance={inst('tax')} />);
    for (const [cardId, name] of rows) {
      for (const isUpgraded of [false, true]) {
        rerender(<Card size="sheet" instance={inst(cardId, isUpgraded)} damageMultiplier={2} />);
        expect(container.querySelector('[data-card-chip="damage"]')).toBeNull();
        expect(el(container, UP).getAttribute('aria-label')).toBe(`${name}${upgradedSuffix(isUpgraded)}`);
      }
    }
  });
});

describe('cost chip (spec v7 §5.4)', () => {
  it.each<[CardId, boolean, string, string]>([
    ['basic-attack', false, 'points', '1 pt'],
    ['super-attack', true, 'points', '10 pts'],
    ['tax', false, 'lives', '1 life'],
    ['tax', true, 'lives', '1 life'],
    ['regeneration', false, 'pointsPerLife', '3 pts/life'],
    ['regeneration', true, 'pointsPerLife', '2 pts/life'],
  ])('%s (upgraded %s) shows a %s chip read as "%s"', (cardId, isUpgraded, kind, spoken) => {
    const { container } = renderUi(<Card size="sheet" instance={inst(cardId, isUpgraded)} />);
    const chip = el(container, '[data-card-chip="cost"]');
    expect(chip.getAttribute('data-cost-kind')).toBe(kind);
    expect(within(chip).getByText(spoken)).toBeTruthy();
    expect(chip.querySelector('[title]')).toBeNull();
  });

  it('stacks both chips on the left at hand and thumb size, corners otherwise; thumbs show no name', () => {
    for (const size of CARD_SIZES) {
      const { container, unmount } = renderUi(<Card size={size} instance={inst('strong-attack')} />);
      const leftStack = size === 'hand' || size === 'thumb';
      expect(el(container, '[data-card-chips]').getAttribute('data-card-chips')).toBe(
        leftStack ? 'left-stack' : 'corners',
      );
      expect(container.querySelector('[data-card-name]')?.textContent ?? null).toBe(
        size === 'thumb' ? null : 'Strong attack',
      );
      unmount();
    }
  });

  it('keeps thumbs art-only plus damage: no cost chip at thumb size (Appendix A global-card-face)', () => {
    const { container, rerender } = renderUi(<Card size="thumb" instance={inst('super-attack')} />);
    expect(container.querySelector('[data-card-chip="cost"]')).toBeNull();
    expect(el(container, '[data-card-chip="damage"]').textContent).toBe('7');

    rerender(<Card size="hand" instance={inst('super-attack')} />);
    expect(el(container, '[data-card-chip="cost"]').getAttribute('data-cost-kind')).toBe('points');
  });
});

describe('upgraded state (spec v7 §5.4)', () => {
  it('shows the gold "+" badge and says "upgraded"', () => {
    const { container, rerender } = renderUi(<Card size="hand" instance={inst('strong-attack', true)} />);
    const badge = el(container, '[data-card-badge="upgraded"]');
    expect(badge.textContent).toBe('+');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(el(container, UP).getAttribute('aria-label')).toBe('Strong attack upgraded, 4 damage');

    rerender(<Card size="hand" instance={inst('strong-attack')} />);
    expect(container.querySelector('[data-card-badge="upgraded"]')).toBeNull();
    expect(el(container, UP).getAttribute('aria-label')).toBe('Strong attack, 2 damage');
  });
});

describe('active persistent counter (L56-06, L58-06)', () => {
  it.each<[CardId, CardCounterKind, number, string]>([
    ['poison', 'card-lives', 1, 'Poison, 1 card life'],
    ['poison', 'card-lives', 3, 'Poison, 3 card lives'],
    ['roulette', 'card-lives', 2, 'Roulette, 2 card lives'],
    ['invisibility', 'turns', 1, 'Invisibility, 1 turn remaining'],
    ['invisibility', 'turns', 4, 'Invisibility, 4 turns remaining'],
  ])('%s with %s %i reads "%s"', (cardId, kind, amount, label) => {
    const { container, getByRole } = renderUi(
      <Card size="thumb" instance={inst(cardId)} counter={{ kind, amount }} />,
    );
    expect(getByRole('article', { name: label })).toBe(el(container, UP));
    const badge = el(container, `[data-card-counter="${kind}"]`);
    expect(badge.textContent).toBe(String(amount));
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-card-layer="glow"]')).not.toBeNull();
  });

  it('renders no counter badge and no glow without a counter', () => {
    const { container } = renderUi(<Card size="thumb" instance={inst('curse')} />);
    expect(container.querySelector('[data-card-counter]')).toBeNull();
    expect(container.querySelector('[data-card-layer="glow"]')).toBeNull();
  });
});

describe('hidden face (spec v7 §5.4)', () => {
  it('exposes neither name nor art for any family or size', () => {
    const names = ALL_ART_CARD_IDS.map((id) => catalogCard(id).name);
    for (const family of FAMILIES) {
      for (const size of CARD_SIZES) {
        const { container, getByRole, unmount } = renderUi(<Card face="hidden" family={family} size={size} />);
        expect(getByRole('article', { name: HIDDEN_CARD_LABEL }).getAttribute('data-card-family')).toBe(family);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('[data-card-id], [data-instance-id], [data-card-chip]')).toBeNull();
        const text = container.textContent;
        for (const name of names) {
          expect(text).not.toContain(name);
        }
        unmount();
      }
    }
  });

  it('calls onActivate with no argument when interactive', async () => {
    const onActivate = vi.fn();
    const { getByRole, user } = renderUi(
      <Card face="hidden" family="special" size="thumb" onActivate={onActivate} />,
    );
    await user.click(getByRole('button', { name: HIDDEN_CARD_LABEL }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith();
  });
});

describe('long-press guard (spec v7 §6.6.5)', () => {
  it('prevents the context menu on every face and on the art', () => {
    const { container, getByRole, rerender } = renderUi(<Card size="hand" instance={inst('roulette')} />);
    expect(fireEvent.contextMenu(el(container, UP))).toBe(false);
    expect(fireEvent.contextMenu(el(container, 'img'))).toBe(false);

    rerender(<Card size="hand" instance={inst('roulette')} onActivate={vi.fn()} />);
    expect(fireEvent.contextMenu(getByRole('button'))).toBe(false);

    rerender(<Card face="hidden" family="attack" size="hand" />);
    expect(fireEvent.contextMenu(el(container, '[data-card-face="hidden"]'))).toBe(false);
  });

  it('disables text selection and the iOS callout on the root', () => {
    const { container } = renderUi(<Card size="hand" instance={inst('tax')} />);
    const rootClasses = classes(el(container, UP));
    expect(rootClasses).toContain('select-none');
    expect(rootClasses).toContain('[-webkit-touch-callout:none]');
  });
});

describe('activation (spec v7 §6.6.5)', () => {
  it('calls back with the instance id on click and on Enter', async () => {
    const onActivate = vi.fn();
    const { getByRole, user } = renderUi(
      <Card
        size="hand"
        instance={{ instanceId: 'h-7', cardId: 'basic-attack', isUpgraded: false }}
        onActivate={onActivate}
      />,
    );
    const button = getByRole('button', { name: 'Basic attack, 1 damage' });
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenNthCalledWith(1, 'h-7');
    expect(onActivate).toHaveBeenNthCalledWith(2, 'h-7');
  });

  it('marks selection with aria-pressed and keeps an unplayable face activatable', async () => {
    const onActivate = vi.fn();
    const { container, rerender, user } = renderUi(
      <Card size="hand" instance={inst('tax')} onActivate={onActivate} />,
    );
    expect(el(container, UP).getAttribute('aria-pressed')).toBe('false');

    rerender(<Card size="hand" instance={inst('tax')} onActivate={onActivate} selected unplayable />);
    const root = el(container, UP);
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.getAttribute('data-unplayable')).toBe('true');
    await user.click(root);
    expect(onActivate).toHaveBeenCalledWith('inst-tax');
  });

  it('renders an article, not a button, without onActivate', () => {
    const { getByRole, queryByRole } = renderUi(<Card size="sheet" instance={inst('tax')} selected />);
    expect(queryByRole('button')).toBeNull();
    expect(getByRole('article').hasAttribute('aria-pressed')).toBe(false);
  });
});

describe('art (spec v7 §5.4–§5.5; Appendix A global-activated-art-guard)', () => {
  it('always shows the base drawing from artFor, never activated art', () => {
    const ids: readonly CardId[] = [...CARDS_WITH_ACTIVATED_ART, 'sentence', 'shield'];
    const { container, rerender } = renderUi(<Card size="sheet" instance={inst('sentence')} />);
    for (const cardId of ids) {
      for (const isUpgraded of [false, true]) {
        rerender(
          <Card size="sheet" instance={inst(cardId, isUpgraded)} counter={{ kind: 'card-lives', amount: 2 }} />,
        );
        const img = el(container, 'img');
        expect(img.getAttribute('src')).toBe(artFor(cardId));
        expect(img.getAttribute('src')).not.toMatch(/activated/i);
        expect(img.getAttribute('alt')).toBe('');
      }
    }
  });
});

describe('root anchors and rims', () => {
  it('carries the card anchors, caller data attributes and className', () => {
    const { container } = renderUi(
      <Card
        size="tile"
        instance={{ instanceId: 'x-1', cardId: 'spy', isUpgraded: false }}
        className="extra-class"
        dataAttributes={{ 'data-tutorial-highlight': 'hand-card' }}
      />,
    );
    const root = el(container, UP);
    expect(root.getAttribute('data-card-id')).toBe('spy');
    expect(root.getAttribute('data-instance-id')).toBe('x-1');
    expect(root.getAttribute('data-card-size')).toBe('tile');
    expect(root.getAttribute('data-tutorial-highlight')).toBe('hand-card');
    expect(classes(root)).toContain('extra-class');
  });

  it('gives attacks and actions the holo rim and specials the gold rim', () => {
    const rows = [
      ['basic-attack', 'holo'],
      ['tax', 'holo'],
      ['roulette', 'gold'],
      ['mega-attack', 'gold'],
    ] as const;
    const { container, rerender } = renderUi(<Card size="tile" instance={inst('basic-attack')} />);
    for (const [cardId, rim] of rows) {
      rerender(<Card size="tile" instance={inst(cardId)} />);
      expect(el(container, UP).getAttribute('data-card-rim')).toBe(rim);
    }
    rerender(<Card face="hidden" family="special" size="tile" />);
    expect(el(container, '[data-card-face="hidden"]').getAttribute('data-card-rim')).toBe('gold');
  });
});

describe('no effect text on any face (spec v7 §5.4)', () => {
  it('never prints effect, upgrade effect or upgrade adds, at any size', () => {
    for (const size of CARD_SIZES) {
      const { container, rerender, unmount } = renderUi(<Card size={size} instance={inst('basic-attack')} />);
      for (const cardId of ALL_ART_CARD_IDS) {
        const card = catalogCard(cardId);
        const prose = [card.effect, card.upgradeEffect, card.upgradeAdds].filter((text) => text !== '');
        for (const isUpgraded of [false, true]) {
          rerender(<Card size={size} instance={inst(cardId, isUpgraded)} />);
          const text = container.textContent;
          for (const line of prose) {
            expect(text).not.toContain(line);
          }
        }
      }
      unmount();
    }
  });
});

describe('reduced motion (spec v7 §5.7, §8.3)', () => {
  const activeUpgraded = (
    <Card
      size="hand"
      instance={inst('points-generator', true)}
      counter={{ kind: 'card-lives', amount: 2 }}
      selected
      onActivate={vi.fn()}
    />
  );

  it('animates the sheen, the pulse and the selected lift with full motion', () => {
    const { container } = renderUi(activeUpgraded);
    const root = el(container, UP);
    expect(root.getAttribute('data-motion')).toBe('full');
    expect(classes(el(container, '[data-card-layer="sheen-sweep"]'))).toContain('v7-card-sheen');
    expect(classes(el(container, '[data-card-layer="glow"]'))).toContain('animate-pulse');
    expect(motionClasses(root)).toContain('-translate-y-2');
    expect(motionClasses(root)).toContain('scale-105');
  });

  it('drops the sheen sweep, the pulse and the lift, and keeps every badge', () => {
    const { container } = renderUi(activeUpgraded, { reducedMotion: true });
    const root = el(container, UP);
    expect(root.getAttribute('data-motion')).toBe('reduced');
    expect(container.querySelector('[data-card-layer="sheen-sweep"]')).toBeNull();
    expect(container.querySelector('[data-card-layer="sheen"]')).not.toBeNull();
    expect(classes(el(container, '[data-card-layer="glow"]'))).not.toContain('animate-pulse');
    expect(motionClasses(root)).toEqual([]);
    expect(el(container, '[data-card-badge="upgraded"]').textContent).toBe('+');
    expect(el(container, '[data-card-counter="card-lives"]').textContent).toBe('2');
    expect(root.getAttribute('aria-pressed')).toBe('true');
  });
});
