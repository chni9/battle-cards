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
import {
  ARENA_TEST_BOXES,
  arenaSpies,
  expectNoArenaIntent,
  makeArenaProps,
  makeArenaView,
  stubArenaLayout,
  type ArenaLayoutStub,
  type ArenaLayoutStubOptions,
} from './test-view';

const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const HAND = [makeCard('spy', { instanceId: 'spy-1' }), makeCard('basic-attack', { instanceId: 'atk-1' })];
function withSeat(view: PlayingStateView, playerId: string, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch } : player)) };
}
/** Me, p1, p2; 10 points; Spy and Basic attack in hand; p1 spies on me, so Unspy opens. */
const crossView = (): PlayingStateView => withSeat(makeArenaView({ overrides: { self: makeSelf({ points: 10, hand: HAND }) } }), 'p1', { spyingOnYou: true });

/**
 * The rects a lift measures (`measureDropZones`): p1's seat alone holds the release point, and p2's seat
 * sits clear of it. Under the stub's default every element reports the arena box, so both seats would
 * hold it, `dropTarget` would resolve nothing, and a release would send nothing with or without the
 * cancel. With these, a release at `RELEASE` plays the card on p1 unless the cancel stopped it.
 */
function seatRectFor(element: Element): DOMRect | undefined {
  if (element.getAttribute('data-zone') !== 'opponent-seat') return undefined;
  return element.getAttribute('data-player-id') === 'p1' ? new DOMRect(0, 0, 100, 100) : new DOMRect(250, 100, 76, 92);
}
const PRESS = { clientX: 100, clientY: 700 };
const LIFT = { clientX: 103, clientY: 688 };
const RELEASE = { clientX: 50, clientY: 50 };

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });
function setup(options: RenderUiOptions = {}, layoutOptions: ArenaLayoutStubOptions = {}) {
  const stub = stubArenaLayout(ARENA_TEST_BOXES.phone390.viewport, ARENA_TEST_BOXES.phone390.arena, layoutOptions);
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

  it('control: without a mode change, the same press, lift and release plays the card on p1', () => {
    const { onPlayCard, props } = setup({ reducedMotion: true }, { rectFor: seatRectFor });
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, ...PRESS });
    fireEvent.pointerMove(window, { ...PRIMARY, ...LIFT });
    expect(ghost()).not.toBeNull();
    fireEvent.pointerUp(window, { ...PRIMARY, ...RELEASE });
    expect(onPlayCard.mock.calls).toEqual([['atk-1', { targetPlayerId: 'p1' }]]);
    expect(arenaSpies(props).filter((spy) => spy.mock.calls.length > 0)).toHaveLength(1);
  });

  it('a lifted drag is cancelled by a mode change and sends nothing, though its stale rects still hold the release (A.5.3)', () => {
    const { props, stub } = setup({ reducedMotion: true }, { rectFor: seatRectFor });
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, ...PRESS });
    fireEvent.pointerMove(window, { ...PRIMARY, ...LIFT });
    expect(ghost()).not.toBeNull();
    stub.setViewport(1440, 900);
    expect(ghost()).toBeNull();
    // p1's seat rect, measured at the lift, still holds this point: the control above sends from here.
    fireEvent.pointerUp(window, { ...PRIMARY, ...RELEASE });
    expectNoArenaIntent(props);
  });

  it('a press that has not lifted yet is dropped by a mode change: the next move lifts nothing, and a release sends nothing', () => {
    const { props, stub } = setup({ reducedMotion: true }, { rectFor: seatRectFor });
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, ...PRESS });
    stub.setViewport(390, 420);
    fireEvent.pointerMove(window, { ...PRIMARY, ...LIFT });
    expect(ghost()).toBeNull();
    // Uncancelled, the move above lifts and this release plays the card on p1 (the control).
    fireEvent.pointerUp(window, { ...PRIMARY, ...RELEASE });
    expect(ghost()).toBeNull();
    expectNoArenaIntent(props);
  });

  it('a portrait to landscape-compact flip and back keeps the strip, the kit portrait and the pills mounted, focus included (one tree)', () => {
    const { props, stub } = setup();
    const strip = region('self-strip');
    const nodes = () => ({
      root: strip.querySelector('[data-self-strip]'),
      kit: within(strip).getByRole('button', { name: 'Inspect your kit' }),
      pills: Array.from(strip.querySelectorAll('[data-resource-kind]')),
    });
    const before = nodes();
    expect(before.pills).toHaveLength(4);
    act(() => { before.kit.focus(); });
    for (const [width, height, expectedMode, expectedStrip] of [[844, 390, 'landscape-compact', 'compact'], [390, 844, 'portrait', 'full']] as const) {
      stub.setViewport(width, height);
      const after = nodes();
      expect([mode(), after.root?.getAttribute('data-self-strip')]).toEqual([expectedMode, expectedStrip]);
      expect(after.root).toBe(before.root);
      expect(after.kit).toBe(before.kit);
      expect(after.pills).toHaveLength(4);
      after.pills.forEach((pill, index) => { expect(pill).toBe(before.pills[index]); });
      expect(document.activeElement).toBe(before.kit);
    }
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
