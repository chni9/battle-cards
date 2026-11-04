// @vitest-environment happy-dom
/**
 * A layout mode crossing mid-interaction: plan Review Focus 1; technical spec v7 §6.4, §6.6.3,
 * §6.7; Appendix A.3 (no region remounts) and A.5.3 (a mode change cancels a drag); controller
 * open-question ruling 7 (the mode holds while a text field has focus) (L75-03). The coach's half
 * (its message key and hidden state across a crossing) is L75-04's.
 */
import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import { act, fireEvent, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../test/render';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';

const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const HAND = [makeCard('spy', { instanceId: 'spy-1' }), makeCard('basic-attack', { instanceId: 'atk-1' })];
function withSeat(view: PlayingStateView, playerId: string, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch } : player)) };
}
/** Me, p1, p2; 10 points; Spy and Basic attack in hand; p1 spies on me, so Unspy opens. */
const crossView = (): PlayingStateView => withSeat(makeArenaView({ overrides: { self: makeSelf({ points: 10, hand: HAND }) } }), 'p1', { spyingOnYou: true });

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });
function setup(options: RenderUiOptions = {}) {
  const stub = stubArenaLayout(ARENA_TEST_BOXES.phone390.viewport, ARENA_TEST_BOXES.phone390.arena);
  layout = stub;
  const onPlayCard = vi.fn<ArenaScreenProps['onPlayCard']>();
  const props = makeArenaProps({ view: crossView(), onPlayCard });
  return { stub, onPlayCard, props, ...renderUi(<ArenaScreen {...props} />, options) };
}
const mode = (): string | null | undefined => document.querySelector('main[data-arena="next"]')?.getAttribute('data-layout-mode');
function region(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (found === null) throw new Error(`no ${name} region`);
  return found;
}
const ghost = (): Element | null => document.querySelector('[data-zone="hand-drag-ghost"]');
/** A rotation to desktop, then a short window (landscape-compact), each checked. */
function cross(stub: ArenaLayoutStub, check: (next: 'desktop' | 'landscape-compact') => void): void {
  stub.setViewport(1440, 900);
  expect(mode()).toBe('desktop');
  check('desktop');
  stub.setViewport(390, 420);
  expect(mode()).toBe('landscape-compact');
  check('landscape-compact');
}

describe('a mode crossing mid-interaction (Review Focus 1)', () => {
  it('an open card sheet stays open and re-places: bottom, centred on desktop, bottom again', async () => {
    const { user, props, stub } = setup();
    await user.click(within(region('hand')).getByRole('button', { name: 'Spy' }));
    const placement = (): string | null => screen.getByRole('dialog', { name: 'Spy' }).getAttribute('data-sheet-placement');
    expect(placement()).toBe('bottom');
    cross(stub, (next) => { expect(placement()).toBe(next === 'desktop' ? 'center' : 'bottom'); });
    expectNoArenaIntent(props);
  });

  it.each<{ label: string; open: (user: UserEvent) => Promise<void>; dialog: string }>([
    { label: 'the menu', open: (user) => user.click(within(region('top-bar')).getByRole('button', { name: 'Menu' })), dialog: 'Menu' },
    { label: 'the leave confirm', open: (user) => user.click(within(region('top-bar')).getByRole('button', { name: 'Forfeit' })), dialog: 'Leave the game?' },
    { label: 'the Unspy picker', open: (user) => user.click(within(region('dock')).getByRole('button', { name: 'Unspy, minus 10 pts' })), dialog: 'Unspy' },
  ])('$label (owner-local) stays open across both crossings: no region remounts (A.3)', async ({ open, dialog }) => {
    const { user, props, stub } = setup();
    await open(user);
    cross(stub, () => { expect(screen.getByRole('dialog', { name: dialog })).toBeTruthy(); });
    expectNoArenaIntent(props);
  });

  it('live targeting survives both crossings, and a valid seat tap then sends exactly once', async () => {
    const { user, onPlayCard, stub } = setup();
    await user.click(within(region('hand')).getByRole('button', { name: 'Spy' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: /^Use/ }));
    cross(stub, () => { expect(screen.queryByText('Choose a target')).not.toBeNull(); });
    await user.click(within(region('arena')).getByRole('button', { name: 'p1, target' }));
    expect(onPlayCard.mock.calls).toEqual([['spy-1', { targetPlayerId: 'p1' }]]);
  });

  it('a lifted drag is cancelled by a mode change and sends nothing, though its release lands on a valid seat (A.5.3)', () => {
    const { props, stub } = setup({ reducedMotion: true });
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, clientX: 100, clientY: 700 });
    fireEvent.pointerMove(window, { ...PRIMARY, clientX: 103, clientY: 688 });
    expect(ghost()).not.toBeNull();
    stub.setViewport(1440, 900);
    expect(ghost()).toBeNull();
    // Every element reports the arena box here, so without the cancel this release would play the card on p1.
    fireEvent.pointerUp(window, { ...PRIMARY, clientX: 50, clientY: 50 });
    expectNoArenaIntent(props);
  });

  it('a press that has not lifted yet is dropped by a mode change: the next move lifts nothing', () => {
    const { props, stub } = setup({ reducedMotion: true });
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, clientX: 100, clientY: 700 });
    stub.setViewport(390, 420);
    fireEvent.pointerMove(window, { ...PRIMARY, clientX: 103, clientY: 688 });
    expect(ghost()).toBeNull();
    fireEvent.pointerUp(window, { ...PRIMARY, clientX: 50, clientY: 50 });
    expect(ghost()).toBeNull();
    expectNoArenaIntent(props);
  });

  it('a chat draft holds portrait and keeps its focus under the keyboard; on blur the arena re-lays out and the draft stays (ruling 7)', async () => {
    const { user, props, stub } = setup();
    await user.click(within(region('top-bar')).getByRole('button', { name: /^Chat/ }));
    const field = (): HTMLInputElement => within(screen.getByRole('dialog', { name: 'Chat' })).getByRole<HTMLInputElement>('textbox', { name: 'Message' });
    await user.type(field(), 'gl hf');
    stub.setViewport(390, 420);
    expect([mode(), document.activeElement === field(), field().value]).toEqual(['portrait', true, 'gl hf']);
    act(() => { field().blur(); });
    expect([mode(), field().value]).toEqual(['landscape-compact', 'gl hf']);
    expectNoArenaIntent(props);
  });
});
