// @vitest-environment happy-dom
/**
 * Holo Card — technical spec v7 §5.4, §5.5, §6.6.5, §8.3.
 * Parity (Appendix A): global-card-face, global-activated-art-guard,
 * global-art-lot63-gambler-roulette, active-persistent-thumbs, sentence-chips.
 */
import {
  getCard,
  listedAttackDamage,
  type Card as CatalogCard,
  type CardId,
  type CardInstance,
  type CardType,
} from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { ALL_ART_CARD_IDS, CARDS_WITH_ACTIVATED_ART, artFor } from '../asset-lookup';
import { Card } from './card';
import { CARD_SIZES, HIDDEN_CARD_LABEL, type CardCounterKind } from './card-face';

const FAMILIES: readonly CardType[] = ['attack', 'action', 'special'];
const UP = '[data-card-face="up"]';

const inst = (cardId: CardId, isUpgraded = false): CardInstance => ({
  instanceId: `inst-${cardId}`,
  cardId,
  isUpgraded,
});

const classes = (node: HTMLElement): string[] => node.className.split(' ');

const motionClasses = (node: HTMLElement): string[] =>
  classes(node).filter((name) => name.includes('translate') || name.startsWith('scale-'));

function el(root: HTMLElement, selector: string): HTMLElement {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`missing ${selector}`);
  }
  return node;
}

function catalogCard(cardId: CardId): CatalogCard {
  const card = getCard(cardId);
  if (card === undefined) {
    throw new Error(`missing catalog card ${cardId}`);
  }
  return card;
}

function faceName(name: string, upgraded: boolean): string {
  return `${name}${upgraded ? ' upgraded' : ''}`;
}

describe('damage chip (spec v7 §5.4, L56-04)', () => {
  it('shows catalog damage × multiplier on every attack, base and upgraded', () => {
    const rows = [
      ['basic-attack', 'Basic attack'],
      ['strong-attack', 'Strong attack'],
      ['super-attack', 'Super attack'],
      ['mega-attack', 'MEGA ATTACK'],
    ] as const;
    const { container, rerender } = renderUi(<Card size="sheet" instance={inst('basic-attack')} />);
    for (const [cardId, name] of rows) {
      for (const upgraded of [false, true]) {
        for (const damageMultiplier of [1, 2]) {
          rerender(
            <Card size="sheet" instance={inst(cardId, upgraded)} damageMultiplier={damageMultiplier} />,
          );
          const listed = listedAttackDamage(cardId, upgraded, damageMultiplier);
          if (listed === null) {
            throw new Error(`expected damage for ${cardId}`);
          }
          const root = el(container, UP);
          expect(el(root, '[data-card-chip="damage"]').textContent).toBe(String(listed));
          expect(
            screen.getByRole('article', { name: `${faceName(name, upgraded)}, ${String(listed)} damage` }),
          ).toBe(root);
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
    const { container, rerender } = renderUi(
      <Card size="sheet" instance={inst('tax')} damageMultiplier={2} />,
    );
    for (const [cardId, name] of rows) {
      for (const upgraded of [false, true]) {
        rerender(<Card size="sheet" instance={inst(cardId, upgraded)} damageMultiplier={2} />);
        const root = el(container, UP);
        expect(root.querySelector('[data-card-chip="damage"]')).toBeNull();
        expect(screen.getByRole('article', { name: faceName(name, upgraded) })).toBe(root);
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
  ])('%s (upgraded %s) shows a %s chip read as "%s"', (cardId, upgraded, kind, spoken) => {
    const { container } = renderUi(<Card size="sheet" instance={inst(cardId, upgraded)} />);
    const chip = el(container, '[data-card-chip="cost"]');
    expect(chip.getAttribute('data-cost-kind')).toBe(kind);
    expect(within(chip).getByText(spoken)).toBeTruthy();
    expect(chip.querySelector('[title]')).toBeNull();
  });

  it('stacks both chips on the left at hand and thumb size, corners otherwise; thumbs show no name', () => {
    for (const size of CARD_SIZES) {
      const { container, unmount } = renderUi(<Card size={size} instance={inst('strong-attack')} />);
      expect(el(container, '[data-card-chips]').getAttribute('data-card-chips')).toBe(
        size === 'hand' || size === 'thumb' ? 'left-stack' : 'corners',
      );
      expect(container.querySelector('[data-card-name]')?.textContent ?? null).toBe(
        size === 'thumb' ? null : 'Strong attack',
      );
      unmount();
    }
  });
});

describe('upgraded state (spec v7 §5.4)', () => {
  it('shows the gold "+" badge and says "upgraded"', () => {
    const { container, rerender } = renderUi(
      <Card size="hand" instance={inst('strong-attack', true)} />,
    );
    const badge = el(container, '[data-card-badge="upgraded"]');
    expect(badge.textContent).toBe('+');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('article', { name: 'Strong attack upgraded, 4 damage' })).toBe(
      el(container, UP),
    );
    rerender(<Card size="hand" instance={inst('strong-attack')} />);
    expect(container.querySelector('[data-card-badge="upgraded"]')).toBeNull();
    expect(screen.getByRole('article', { name: 'Strong attack, 2 damage' })).toBe(el(container, UP));
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
    const { container } = renderUi(
      <Card size="thumb" instance={inst(cardId)} counter={{ kind, amount }} />,
    );
    const root = el(container, UP);
    expect(screen.getByRole('article', { name: label })).toBe(root);
    const counter = el(container, `[data-card-counter="${kind}"]`);
    expect(counter.textContent).toBe(String(amount));
    expect(counter.getAttribute('aria-hidden')).toBe('true');
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
    for (const family of FAMILIES) {
      for (const size of CARD_SIZES) {
        const { container, unmount } = renderUi(<Card face="hidden" family={family} size={size} />);
        const article = screen.getByRole('article', { name: HIDDEN_CARD_LABEL });
        expect(article.getAttribute('data-card-family')).toBe(family);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('[data-card-id], [data-instance-id], [data-card-chip]')).toBeNull();
        const text = container.textContent;
        for (const id of ALL_ART_CARD_IDS) {
          expect(text).not.toContain(catalogCard(id).name);
        }
        unmount();
      }
    }
  });

  it('calls onActivate with no argument when interactive', async () => {
    const onActivate = vi.fn();
    const { user } = renderUi(
      <Card face="hidden" family="special" size="thumb" onActivate={onActivate} />,
    );
    await user.click(screen.getByRole('button', { name: HIDDEN_CARD_LABEL }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith();
  });
});

describe('long-press guard (spec v7 §6.6.5)', () => {
  it('prevents the context menu on every face and on the art', () => {
    const { container, rerender } = renderUi(<Card size="hand" instance={inst('roulette')} />);
    const root = el(container, UP);
    expect(fireEvent.contextMenu(root)).toBe(false);
    expect(fireEvent.contextMenu(el(root, 'img'))).toBe(false);
    rerender(<Card size="hand" instance={inst('roulette')} onActivate={vi.fn()} />);
    expect(fireEvent.contextMenu(screen.getByRole('button'))).toBe(false);
    const hidden = renderUi(<Card face="hidden" family="attack" size="hand" />);
    expect(fireEvent.contextMenu(el(hidden.container, '[data-card-face="hidden"]'))).toBe(false);
    hidden.unmount();
  });

  it('disables text selection and the iOS callout on the root', () => {
    const { container } = renderUi(<Card size="hand" instance={inst('tax')} />);
    const names = classes(el(container, UP));
    expect(names).toContain('select-none');
    expect(names).toContain('[-webkit-touch-callout:none]');
  });
});

describe('activation (spec v7 §6.6.5)', () => {
  it('calls back with the instance id on click and on Enter', async () => {
    const onActivate = vi.fn();
    const { user } = renderUi(
      <Card
        size="hand"
        instance={{ instanceId: 'h-7', cardId: 'basic-attack', isUpgraded: false }}
        onActivate={onActivate}
      />,
    );
    const button = screen.getByRole('button', { name: 'Basic attack, 1 damage' });
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenNthCalledWith(1, 'h-7');
    expect(onActivate).toHaveBeenNthCalledWith(2, 'h-7');
  });

  it('marks selection with aria-pressed and keeps an unplayable face activatable', async () => {
    const onActivate = vi.fn();
    const { user, rerender } = renderUi(
      <Card size="hand" instance={inst('tax')} onActivate={onActivate} />,
    );
    expect(screen.getByRole('button', { name: 'Tax' }).getAttribute('aria-pressed')).toBe('false');
    rerender(
      <Card size="hand" instance={inst('tax')} onActivate={onActivate} selected unplayable />,
    );
    const button = screen.getByRole('button', { name: 'Tax' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-unplayable')).toBe('true');
    await user.click(button);
    expect(onActivate).toHaveBeenCalledWith('inst-tax');
  });

  it('renders an article, not a button, without onActivate', () => {
    renderUi(<Card size="sheet" instance={inst('tax')} selected />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('article').hasAttribute('aria-pressed')).toBe(false);
  });
});

describe('art (spec v7 §5.4–§5.5; Appendix A global-activated-art-guard)', () => {
  it('always shows the base drawing from artFor, never activated art', () => {
    const ids: readonly CardId[] = [...CARDS_WITH_ACTIVATED_ART, 'sentence', 'shield'];
    const { container, rerender } = renderUi(
      <Card size="sheet" instance={inst('sentence')} counter={{ kind: 'card-lives', amount: 2 }} />,
    );
    for (const cardId of ids) {
      for (const upgraded of [false, true]) {
        rerender(
          <Card
            size="sheet"
            instance={inst(cardId, upgraded)}
            counter={{ kind: 'card-lives', amount: 2 }}
          />,
        );
        const img = el(container, 'img');
        expect(img.getAttribute('src')).toBe(artFor(cardId));
        expect(img.getAttribute('src') ?? '').not.toMatch(/activated/i);
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
    for (const [cardId, rim] of rows) {
      const { container, unmount } = renderUi(<Card size="tile" instance={inst(cardId)} />);
      expect(el(container, '[data-card-rim]').getAttribute('data-card-rim')).toBe(rim);
      unmount();
    }
    const hidden = renderUi(<Card face="hidden" family="special" size="tile" />);
    expect(el(hidden.container, '[data-card-face="hidden"]').getAttribute('data-card-rim')).toBe('gold');
    hidden.unmount();
  });
});

describe('no effect text on any face (spec v7 §5.4)', () => {
  it('never prints effect, upgrade effect or upgrade adds, at any size', () => {
    for (const cardId of ALL_ART_CARD_IDS) {
      const card = catalogCard(cardId);
      const copies = [card.effect, card.upgradeEffect, card.upgradeAdds].filter((copy) => copy !== '');
      for (const size of CARD_SIZES) {
        for (const upgraded of [false, true]) {
          const { container, unmount } = renderUi(
            <Card size={size} instance={inst(cardId, upgraded)} />,
          );
          const text = container.textContent;
          for (const copy of copies) {
            expect(text).not.toContain(copy);
          }
          unmount();
        }
      }
    }
  });
});

describe('reduced motion (spec v7 §5.7, §8.3)', () => {
  function motionCard(reducedMotion?: boolean) {
    return renderUi(
      <Card
        size="hand"
        instance={inst('points-generator', true)}
        counter={{ kind: 'card-lives', amount: 2 }}
        selected
        onActivate={vi.fn()}
      />,
      reducedMotion === true ? { reducedMotion: true } : {},
    );
  }

  it('animates the sheen, the pulse and the selected lift with full motion', () => {
    const { container } = motionCard();
    const root = el(container, UP);
    expect(root.getAttribute('data-motion')).toBe('full');
    expect(el(container, '[data-card-layer="sheen-sweep"]').classList.contains('v7-card-sheen')).toBe(
      true,
    );
    expect(el(container, '[data-card-layer="glow"]').classList.contains('animate-pulse')).toBe(true);
    expect(motionClasses(root)).toEqual(expect.arrayContaining(['-translate-y-2', 'scale-105']));
  });

  it('drops the sheen sweep, the pulse and the lift, and keeps every badge', () => {
    const { container } = motionCard(true);
    const root = el(container, UP);
    expect(root.getAttribute('data-motion')).toBe('reduced');
    expect(container.querySelector('[data-card-layer="sheen-sweep"]')).toBeNull();
    expect(container.querySelector('[data-card-layer="sheen"]')).not.toBeNull();
    expect(el(container, '[data-card-layer="glow"]').classList.contains('animate-pulse')).toBe(false);
    expect(motionClasses(root)).toEqual([]);
    expect(el(container, '[data-card-badge="upgraded"]').textContent).toBe('+');
    expect(el(container, '[data-card-counter="card-lives"]').textContent).toBe('2');
    expect(root.getAttribute('aria-pressed')).toBe('true');
  });
});
