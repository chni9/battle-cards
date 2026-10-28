// @vitest-environment happy-dom
/**
 * Read-only card sheet — technical spec v7 §6.6.1 (face at sheet size, Cost row, effect and
 * Upgrade block), §5.4, Lot 74 plan ruling 1 (activated look = counter glow; Shield and
 * Sentence never), L56-05 (queue / log: no footer). It is also the behavior replacement that
 * the Owner lot 74 `card-effect-copy` classification row asks for (L51-12).
 */
import type { CardId, PlayingStateView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { glyphRoots, spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import type { ActionContext } from '../../view-model/action-lock';
import { inPlayThumbs } from '../../view-model/card-actions';
import { makeCard, makePersistent, makeSelf } from '../../view-model/test-fixtures';
import { CardSheet } from './card-sheet';
import type { CardSheetSource } from './card-sheet-source';
import { makeArenaView } from './test-view';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const SENTENCE = { id: 'sentence-s', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false };

function boardWith(poisonCounter: number): PlayingStateView {
  return makeArenaView({
    overrides: {
      self: makeSelf({
        shield: 4,
        activePersistentEffects: [
          makePersistent({ id: 'poison-e', cardId: 'poison', counter: poisonCounter }),
          makePersistent({ id: 'invisibility-e', cardId: 'invisibility', counter: 4 }),
        ],
      }),
      pendingSentences: [SENTENCE],
    },
  });
}
const BOARD = boardWith(3);

function inPlay(cardId: CardId): CardSheetSource {
  const thumb = inPlayThumbs(BOARD, 'me').find((entry) => entry.instance.cardId === cardId);
  if (thumb === undefined) {
    throw new Error(`no ${cardId} thumb`);
  }
  return { kind: 'in-play', thumb };
}

function renderSheet(source: CardSheetSource, view: PlayingStateView = BOARD): ReturnType<typeof renderUi> & { onClose: () => void } {
  const onClose = vi.fn();
  return { ...renderUi(<CardSheet open source={source} view={view} ctx={LIVE} onClose={onClose} />), onClose };
}

function part(root: HTMLElement, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-effect-part="${name}"]`);
  if (found === null) {
    throw new Error(`missing ${name} part`);
  }
  return found;
}

function overlayOf(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) {
    throw new Error('no sheet overlay');
  }
  return overlay;
}

describe('CardSheet, read-only (spec v7 §6.6.1, L74-02)', () => {
  it('shows a base card at sheet size with Cost, the effect and the Upgrade block', () => {
    renderSheet({ kind: 'hand', instance: makeCard('regeneration', { instanceId: 'regen-1' }) });
    const sheet = screen.getByRole('dialog', { name: 'Regeneration' });
    expect(sheet.getAttribute('data-arena-sheet')).toBe('card:regen-1');
    expect(within(sheet).getByRole('article', { name: 'Regeneration' }).getAttribute('data-card-size')).toBe('sheet');
    expect(within(part(sheet, 'cost')).getByText('Cost')).toBeTruthy();
    expect(spokenTexts(part(sheet, 'cost'))).toEqual(['3 pts/life']);
    expect(glyphRoots(part(sheet, 'effect'))).toHaveLength(2);
    expect(spokenTexts(part(sheet, 'effect'))).toEqual(['4 lives', '3 pts']);
    expect(visibleText(part(sheet, 'upgrade'))).toBe('Upgrade — Lives cost 2 each instead of 3.');
    expect(within(sheet).queryByText(/Cost:/)).toBeNull();
    expect(within(sheet).queryByText('Choose Use, Upgrade, or Sell.')).toBeNull();
  });

  it('shows upgradeEffect alone for an upgraded card', () => {
    renderSheet({ kind: 'hand', instance: makeCard('basic-attack', { isUpgraded: true }) });
    const sheet = screen.getByRole('dialog', { name: 'Basic attack' });
    expect(within(sheet).getByRole('article', { name: 'Basic attack upgraded, 3 damage' })).toBeTruthy();
    expect(part(sheet, 'effect').textContent).toBe('Deal 3 damage to an opponent.');
    expect(sheet.querySelector('[data-effect-part="upgrade"]')).toBeNull();
  });

  it.each([
    { cardId: 'shield', name: 'Shield', count: null },
    { cardId: 'sentence', name: 'Sentence', count: 'Turns left2' },
  ] as const)('never gives $name the activated look; its turns stay a separate badge (A.8 ruling 1)', ({ cardId, name, count }) => {
    renderSheet(inPlay(cardId));
    const sheet = screen.getByRole('dialog', { name });
    const face = within(sheet).getByRole('article', { name });
    expect([face.querySelector('[data-card-layer="glow"]'), face.querySelector('[data-card-counter]')]).toEqual([null, null]);
    expect(within(sheet).getByText('Active')).toBeTruthy();
    expect(within(sheet).queryByText('Turns left')?.parentElement?.textContent ?? null).toBe(count);
    expect(within(sheet).queryByText('Card lives')).toBeNull();
  });

  it.each([
    { cardId: 'poison', face: 'Poison, 3 card lives', counter: 'card-lives', label: 'Card lives', badge: 'Card lives3' },
    { cardId: 'invisibility', face: 'Invisibility, 4 turns remaining', counter: 'turns', label: 'Turns left', badge: 'Turns left4' },
  ] as const)('shows an active $cardId with its counter glow and its count', ({ cardId, face, counter, label, badge }) => {
    renderSheet(inPlay(cardId));
    const sheet = screen.getByRole('dialog', { name: cardId === 'poison' ? 'Poison' : 'Invisibility' });
    const article = within(sheet).getByRole('article', { name: face });
    expect(article.querySelector('[data-card-counter]')?.getAttribute('data-card-counter')).toBe(counter);
    expect(within(sheet).getByText('Active')).toBeTruthy();
    expect(within(sheet).getByText(label).parentElement?.textContent).toBe(badge);
  });

  it('follows the live counter while it is open', () => {
    const source = inPlay('poison');
    const { rerender } = renderSheet(source);
    rerender(<CardSheet open source={source} view={boardWith(2)} ctx={LIVE} onClose={vi.fn()} />);
    expect(screen.getByRole('article', { name: 'Poison, 2 card lives' })).toBeTruthy();
  });

  it('labels a Spy reveal as inspect only', () => {
    renderSheet({ kind: 'spy-reveal', instance: makeCard('strong-attack', { instanceId: 'p1-strong' }), ownerPlayerId: 'p1' });
    const sheet = screen.getByRole('dialog', { name: 'Strong attack' });
    expect(within(sheet).getByText('Spy reveal — inspect only')).toBeTruthy();
    expect(within(sheet).queryByText('Active')).toBeNull();
  });

  it.each<{ label: string; source: CardSheetSource; title: string; face: string; key: string }>([
    { label: 'queue', source: { kind: 'queue', effectId: 'e9', cardId: 'basic-attack', isUpgraded: false }, title: 'Basic attack', face: 'Basic attack, 1 damage', key: 'card:queue-e9' },
    { label: 'log', source: { kind: 'log', cardId: 'spy', isUpgraded: true }, title: 'Spy', face: 'Spy upgraded', key: 'card:log-spy-up' },
  ])('renders a $label source as the catalog card with no footer (L56-05)', ({ source, title, face, key }) => {
    renderSheet(source);
    const sheet = screen.getByRole('dialog', { name: title });
    expect(sheet.getAttribute('data-arena-sheet')).toBe(key);
    expect(within(sheet).getByRole('article', { name: face })).toBeTruthy();
    expect([
      within(sheet).queryByText('Active'),
      within(sheet).queryByText('Spy reveal — inspect only'),
      sheet.querySelector('[data-card-sheet-context]'),
    ]).toEqual([null, null, null]);
    expect(within(sheet).queryAllByRole('button')).toEqual([]);
  });

  it('closes through onClose on Esc and on a backdrop press', async () => {
    const { user, onClose } = renderSheet({ kind: 'hand', instance: makeCard('spy') });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(overlayOf(screen.getByRole('dialog', { name: 'Spy' })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
