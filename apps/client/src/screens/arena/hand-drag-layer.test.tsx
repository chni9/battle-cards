// @vitest-environment happy-dom
/**
 * Drag from the hand in the arena: technical spec v7 §6.6.3–§6.6.5 (L74-12). happy-dom has no
 * layout: every measured rect is empty unless a test stubs it, so a drop lands nowhere by default.
 */
import type { PlayingStateView } from '@card-battle/shared';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { readVisualViewportBox } from '../../ui/visual-viewport';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { measureDropZones, sellZoneRect } from './hand-drag';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const HAND = [
  makeCard('basic-attack', { instanceId: 'atk-1' }),
  makeCard('tax', { instanceId: 'tax-1' }),
  makeCard('regeneration', { instanceId: 'regen-1' }),
];
const playView = (overrides: Partial<PlayingStateView> = {}): PlayingStateView => makeArenaView({
  overrides: { self: makeSelf({ points: 30, hand: HAND, specialCards: [makeCard('mega-attack', { instanceId: 'mega-1' })] }), ...overrides },
});
function setup(view: PlayingStateView) {
  const onPlayCard = vi.fn<ArenaScreenProps['onPlayCard']>();
  const onSellCard = vi.fn<ArenaScreenProps['onSellCard']>();
  const props = makeArenaProps({ view, onPlayCard, onSellCard });
  return { onPlayCard, onSellCard, props, ...renderUi(<ArenaScreen {...props} />, { reducedMotion: true }) };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
function anchor(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const seat = (playerId: string): HTMLElement => anchor(`[data-zone="opponent-seat"][data-player-id="${playerId}"]`);
const plate = (): HTMLElement => anchor('[data-zone="pending"]');
const ghost = (): Element | null => document.querySelector('[data-zone="hand-drag-ghost"]');
const sellZone = (): Element | null => document.querySelector('[data-zone="sell-drop"]');
const press = (element: HTMLElement, x: number, y: number): void => { fireEvent.pointerDown(element, { ...PRIMARY, clientX: x, clientY: y }); };
const move = (x: number, y: number): void => { fireEvent.pointerMove(window, { ...PRIMARY, clientX: x, clientY: y }); };
const release = (x: number, y: number): void => { fireEvent.pointerUp(window, { ...PRIMARY, clientX: x, clientY: y }); };
/** Press at (100, 700) and move 12 px up: past the threshold and mostly vertical. */
function lift(card: HTMLElement): void { press(card, 100, 700); move(103, 688); }

describe('drag from the hand (§6.6.3, §6.6.5)', () => {
  it('lifts a ghost only past 8 px vertical, lights the valid seats and sends nothing', () => {
    const { props } = setup(playView());
    const card = handCard('Basic attack, 1 damage');
    press(card, 100, 700);
    move(103, 694);
    expect(ghost()).toBeNull();
    move(103, 688);
    expect(ghost()).not.toBeNull();
    expect(card.closest('[data-lifted]')?.getAttribute('data-lifted')).toBe('true');
    expect([seat('p1').getAttribute('data-drop'), seat('p2').getAttribute('data-drop')]).toEqual(['valid', 'valid']);
    expect(plate().hasAttribute('data-drop')).toBe(false);
    expect(sellZone()?.textContent).toContain('Sell');
    release(103, 650);
    expect([ghost(), sellZone()]).toEqual([null, null]);
    expect(seat('p1').hasAttribute('data-drop')).toBe(false);
    expectNoArenaIntent(props);
  });

  it('a mostly horizontal move is the hand scroll and never lifts', () => {
    const { props } = setup(playView());
    press(handCard('Basic attack, 1 damage'), 100, 700);
    move(115, 697);
    move(130, 680);
    expect(ghost()).toBeNull();
    release(130, 680);
    expectNoArenaIntent(props);
  });

  it('never lifts off-turn, and the tap still opens the sheet', async () => {
    const { user, props } = setup(playView({ currentTurnPlayerId: 'p1' }));
    lift(handCard('Basic attack, 1 damage'));
    expect(ghost()).toBeNull();
    release(103, 650);
    await user.click(handCard('Basic attack, 1 damage'));
    expect(screen.getByRole('dialog', { name: 'Basic attack' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('a drop on a valid seat sends playCard with that target once', () => {
    const { onPlayCard } = setup(playView());
    vi.spyOn(seat('p1'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    lift(handCard('Basic attack, 1 damage'));
    move(50, 50);
    expect(seat('p1').getAttribute('data-drop')).toBe('over');
    release(50, 50);
    expect(onPlayCard.mock.calls).toEqual([['atk-1', { targetPlayerId: 'p1' }]]);
    expect(ghost()).toBeNull();
  });

  it('a drop on the plate sends an untargeted card', () => {
    const { onPlayCard } = setup(playView());
    vi.spyOn(plate(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 300, 120, 96));
    lift(handCard('Tax'));
    expect(plate().getAttribute('data-drop')).toBe('valid');
    expect(seat('p1').hasAttribute('data-drop')).toBe(false);
    release(150, 340);
    expect(onPlayCard.mock.calls).toEqual([['tax-1']]);
  });

  it('Regeneration dropped on the plate opens its choice in the sheet and sends nothing', () => {
    const { props } = setup(playView());
    vi.spyOn(plate(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 300, 120, 96));
    lift(handCard('Regeneration'));
    release(150, 340);
    const dialog = screen.getByRole('dialog', { name: 'Regeneration' });
    expect(within(dialog).getByRole('group', { name: 'Regeneration quantity' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('a drop on the Sell zone sells the card', () => {
    const { onSellCard } = setup(playView());
    lift(handCard('Basic attack, 1 damage'));
    const sell = sellZoneRect({ left: 0, top: 0, width: 0, height: 0 }, 100, readVisualViewportBox().width);
    release(sell.left + sell.width / 2, sell.top + sell.height / 2);
    expect(onSellCard.mock.calls).toEqual([['atk-1']]);
  });

  it('a special shows no Sell zone and lights the plate (MEGA ATTACK)', () => {
    const { props } = setup(playView());
    lift(handCard('MEGA ATTACK, 20 damage'));
    expect(ghost()).not.toBeNull();
    expect(sellZone()).toBeNull();
    expect(plate().getAttribute('data-drop')).toBe('valid');
    release(103, 650);
    expectNoArenaIntent(props);
  });

  it('the click that ends a drag does not open the card sheet; the next tap does', async () => {
    const { user } = setup(playView());
    const card = handCard('Basic attack, 1 damage');
    lift(card);
    release(103, 650);
    // A pointer click: `detail` 1. `fireEvent.click` defaults to 0, a keyboard click (Minor 2).
    fireEvent.click(card, { detail: 1 });
    expect(screen.queryByRole('dialog', { name: 'Basic attack' })).toBeNull();
    await user.click(card);
    expect(screen.getByRole('dialog', { name: 'Basic attack' })).not.toBeNull();
  });

  it('a keyboard activation after a drag that ended off the card opens the sheet (final review, Minor 2)', async () => {
    const { user, props } = setup(playView());
    const card = handCard('Basic attack, 1 damage');
    lift(card);
    // Released over the felt: no click reaches the card.
    release(103, 650);
    act(() => {
      card.focus();
    });
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Basic attack' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('a sheet opened mid-drag stops the drop: the card springs back and nothing is sent (final review, Minor 5)', () => {
    const { props } = setup(playView());
    vi.spyOn(seat('p1'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    lift(handCard('Basic attack, 1 damage'));
    move(50, 50);
    expect(seat('p1').getAttribute('data-drop')).toBe('over');
    // A second finger taps the p2 seat while the card is held: its sheet opens over the arena.
    fireEvent.click(within(seat('p2')).getByRole('button', { name: 'p2' }), { detail: 1 });
    expect(screen.getByRole('dialog', { name: 'p2' })).not.toBeNull();
    release(50, 50);
    expect(ghost()).toBeNull();
    expectNoArenaIntent(props);
  });

  it.each(['blur', 'visibilitychange'] as const)(
    'switching away mid-drag (%s) springs the card back, leaves no ghost and sends nothing (L74-26 gate G7)',
    (how) => {
      const { props } = setup(playView());
      vi.spyOn(seat('p1'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
      lift(handCard('Basic attack, 1 damage'));
      move(50, 50);
      expect(seat('p1').getAttribute('data-drop')).toBe('over');
      if (how === 'blur') {
        fireEvent.blur(window);
      } else {
        // Restored right away: no later test in this file may see the page hidden (review M9).
        const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        fireEvent(document, new Event('visibilitychange'));
        hidden.mockRestore();
        expect(document.visibilityState).toBe('visible');
      }
      expect([ghost(), sellZone()]).toEqual([null, null]);
      expect(seat('p1').hasAttribute('data-drop')).toBe(false);
      // The pointer comes back over the seat and lifts: the drag already ended, so nothing drops.
      release(50, 50);
      expectNoArenaIntent(props);
    },
  );

  it('measures seats and the plate from their arena anchors', () => {
    renderUi(<>
      <div data-zone="opponent-seat" data-player-id="p1" />
      <div data-zone="opponent-seat" data-player-id="p2" />
      <div data-zone="pending" />
    </>);
    const sell = { left: 1, top: 2, width: 3, height: 4 };
    const rects = measureDropZones(document, sell);
    expect(rects.seats.map((entry) => entry.playerId)).toEqual(['p1', 'p2']);
    expect(rects.plate).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    expect(rects.sell).toBe(sell);
  });
});
