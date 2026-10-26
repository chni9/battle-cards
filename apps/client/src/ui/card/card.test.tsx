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
import { CARD_NAME_FIT, CARD_SIZES, HIDDEN_CARD_LABEL, cardNameFontSize, type CardCounterKind } from './card-face';

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

  it('stacks the chips on the left at hand and thumb size, corners otherwise; thumbs show no name', () => {
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

// ---------------------------------------------------------------------------------------------
// L72-12 fix round 1 (visual and code reviews of 8f9da01).

describe('selection and focus stay distinct (fix round 1 A1; spec v7 §5.4)', () => {
  it.each([false, true])('keeps the --cta selection outline on a focused selected card (reduced motion: %s)', async (reduced) => {
    const { container, user } = renderUi(
      <Card size="hand" instance={inst('tax')} selected onActivate={vi.fn()} />,
      { reducedMotion: reduced },
    );
    await user.tab();
    const root = el(container, UP);
    expect(document.activeElement).toBe(root);
    expect(classes(root)).toEqual(expect.arrayContaining(['group', 'outline-3', 'outline-offset-2', 'outline-v7-cta']));
    expect(classes(root).filter((name) => name.startsWith('focus-visible:outline'))).toEqual([]);
    expect(classes(el(root, '[data-card-layer="focus"]'))).toContain('group-focus-visible:block');
  });

  it.each([false, true])('shows the focus ring and no selection cue on a focused unselected card (reduced motion: %s)', async (reduced) => {
    const { container, user } = renderUi(<Card size="hand" instance={inst('tax')} onActivate={vi.fn()} />, {
      reducedMotion: reduced,
    });
    await user.tab();
    const root = el(container, UP);
    expect(document.activeElement).toBe(root);
    expect(classes(root)).toContain('outline-none');
    expect(classes(root)).not.toContain('outline-v7-cta');
    expect(classes(el(root, '[data-card-layer="focus"]'))).toContain('group-focus-visible:block');
  });

  it('draws no focus ring on a static article', () => {
    const { container } = renderUi(<Card size="hand" instance={inst('tax')} selected />);
    expect(container.querySelector('[data-card-layer="focus"]')).toBeNull();
  });
});

describe('definite size (fix round 1 A2)', () => {
  it('derives width and height from one --card-w at every size, with the caller className last', () => {
    const widths: Readonly<Record<string, string>> = {
      hand: 'clamp(64px,19vw,120px)',
      lifted: 'clamp(80px,24vw,150px)',
      sheet: 'clamp(200px,56vw,240px)',
      thumb: '44px',
      tile: 'clamp(88px,26vw,128px)',
    };
    for (const size of CARD_SIZES) {
      const { container, unmount } = renderUi(
        <Card size={size} instance={inst('spy')} onActivate={vi.fn()} className="[--card-w:96px]" />,
      );
      const rootClasses = classes(el(container, UP));
      expect(rootClasses).toContain(`[--card-w-size:${widths[size] ?? ''}]`);
      expect(rootClasses).toContain('w-[var(--card-w,var(--card-w-size))]');
      expect(rootClasses).toContain('h-[calc(var(--card-w,var(--card-w-size))*1.5)]');
      expect(rootClasses.at(-1)).toBe('[--card-w:96px]');
      unmount();
    }
  });
});

describe('chip rail fit (fix round 1 A3)', () => {
  it('puts the "+" badge under the cost chip at corner sizes and after damage in the left stack', () => {
    const { container, rerender } = renderUi(<Card size="lifted" instance={inst('regeneration', true)} />);
    for (const size of ['lifted', 'sheet', 'tile'] as const) {
      rerender(<Card size={size} instance={inst('strong-attack', true)} />);
      const badge = el(container, '[data-card-badge="upgraded"]');
      expect(badge.parentElement).toBe(el(container, '[data-card-chip="cost"]').parentElement);
      expect(badge.parentElement).not.toBe(el(container, '[data-card-chip="damage"]').parentElement);
    }
    rerender(<Card size="hand" instance={inst('strong-attack', true)} />);
    const chips = [...container.querySelectorAll('[data-card-chip], [data-card-badge]')].map(
      (node) => node.getAttribute('data-card-chip') ?? 'badge',
    );
    expect(chips).toEqual(['cost', 'damage', 'badge']);
  });

  it('draws a per-life rate with small icons at lifted and tile', () => {
    for (const size of ['lifted', 'tile'] as const) {
      const { container, unmount } = renderUi(<Card size={size} instance={inst('regeneration', true)} />);
      const widths = [...el(container, '[data-card-chip="cost"]').querySelectorAll('svg')].map((svg) =>
        svg.getAttribute('width'),
      );
      expect(widths).toEqual(['14', '14']);
      unmount();
    }
  });
});

describe('name fit (fix round 1 A4)', () => {
  it('sizes the name from its widest word inside a container-relative face', () => {
    for (const size of ['hand', 'lifted', 'sheet', 'tile'] as const) {
      const { container, unmount } = renderUi(<Card size={size} instance={inst('super-regeneration')} />);
      expect(classes(el(container, '[data-card-layer="face"]'))).toContain('@container');
      const name = el(container, '[data-card-name] > span');
      expect(name.style.getPropertyValue('--card-name-size')).toBe(cardNameFontSize('Super Regeneration', size));
      expect(classes(name)).toContain('text-(length:--card-name-size)');
      expect(classes(name)).not.toContain('hyphens-auto');
      // The fit assumes the strip leaves textPct % of the face for text.
      expect(classes(el(container, '[data-card-name]'))).toContain(
        `px-[${String((100 - CARD_NAME_FIT[size].textPct) / 2)}%]`,
      );
      unmount();
    }
  });
});

describe('unplayable (fix round 1 A5; spec v7 §5.4)', () => {
  it('desaturates and dims an unplayable face, and only that face', () => {
    const { container, rerender } = renderUi(<Card size="hand" instance={inst('suicide')} unplayable />);
    expect(classes(el(container, UP))).toEqual(expect.arrayContaining(['saturate-30', 'brightness-75']));
    expect(el(container, UP).getAttribute('data-unplayable')).toBe('true');
    rerender(<Card size="hand" instance={inst('suicide')} />);
    expect(classes(el(container, UP))).not.toContain('saturate-30');
    expect(classes(el(container, UP))).not.toContain('brightness-75');
    expect(el(container, UP).hasAttribute('data-unplayable')).toBe(false);
  });
});

describe('button and anchors (fix round 1 B2, B3, B7)', () => {
  it('activates with Space', async () => {
    const onActivate = vi.fn();
    const { getByRole, user } = renderUi(<Card size="hand" instance={inst('spy')} onActivate={onActivate} />);
    getByRole('button').focus();
    await user.keyboard(' ');
    expect(onActivate).toHaveBeenCalledExactlyOnceWith('inst-spy');
  });

  it('titles thumbs, which print no name, with their accessible name', () => {
    const { container, rerender } = renderUi(
      <Card size="thumb" instance={inst('poison', true)} counter={{ kind: 'card-lives', amount: 2 }} />,
    );
    expect(el(container, UP).getAttribute('title')).toBe('Poison upgraded, 2 card lives');
    rerender(<Card size="sheet" instance={inst('poison', true)} />);
    expect(el(container, UP).hasAttribute('title')).toBe(false);
  });

  it('lets the fixed data attributes win over dataAttributes', () => {
    const { container } = renderUi(
      <Card
        size="tile"
        instance={inst('spy')}
        dataAttributes={{ 'data-card-id': 'fake', 'data-card-face': 'hidden', 'data-card-size': 'x', 'data-zone': 'hand' }}
      />,
    );
    const root = el(container, UP);
    expect(root.getAttribute('data-card-id')).toBe('spy');
    expect(root.getAttribute('data-card-size')).toBe('tile');
    expect(root.getAttribute('data-zone')).toBe('hand');
  });

  it('lifts a button card on hover with full motion only, and never a selected one', () => {
    const { container, rerender, unmount } = renderUi(<Card size="hand" instance={inst('spy')} onActivate={vi.fn()} />);
    expect(classes(el(container, UP))).toContain('hover:-translate-y-1');
    rerender(<Card size="hand" instance={inst('spy')} onActivate={vi.fn()} selected />);
    expect(classes(el(container, UP))).not.toContain('hover:-translate-y-1');
    rerender(<Card size="hand" instance={inst('spy')} />);
    expect(classes(el(container, UP))).not.toContain('hover:-translate-y-1');
    unmount();
    const reduced = renderUi(<Card size="hand" instance={inst('spy')} onActivate={vi.fn()} />, { reducedMotion: true });
    expect(motionClasses(el(reduced.container, UP))).toEqual([]);
  });
});

describe('holo sheen (fix round 1 B9; spec v7 §5.4, §8.2)', () => {
  it('drifts the holo tint with full motion and holds it still with reduced motion', () => {
    const upgraded = <Card size="sheet" instance={inst('roulette', true)} />;
    const { container, unmount } = renderUi(upgraded);
    const tint = el(container, '[data-card-layer="sheen-tint"]');
    expect(classes(tint)).toEqual(expect.arrayContaining(['bg-[image:var(--card-holo-sheen)]', 'v7-card-holo-drift']));
    unmount();
    const reduced = renderUi(upgraded, { reducedMotion: true });
    expect(classes(el(reduced.container, '[data-card-layer="sheen-tint"]'))).not.toContain('v7-card-holo-drift');
  });
});

describe('hidden gem (fix round 1 B4)', () => {
  it('paints the gem with the family tokens, keeping the glow tokens for the halo', () => {
    const gems = { attack: 'bg-v7-threat-attack', action: 'bg-v7-cta-2', special: 'bg-[image:var(--card-rim-gold)]' };
    const { container, rerender } = renderUi(<Card face="hidden" family="attack" size="hand" />);
    for (const family of FAMILIES) {
      rerender(<Card face="hidden" family={family} size="hand" />);
      expect(classes(el(container, '[data-card-layer="emblem"]'))).toContain(gems[family]);
    }
  });
});
