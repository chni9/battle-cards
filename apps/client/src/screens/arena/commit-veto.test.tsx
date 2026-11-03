// @vitest-environment happy-dom
/**
 * A vetoed send never latches, closes or ends anything: Lot 74 Part 2 final review (L74-25 M1);
 * technical spec v7 §6.6.4; plan A.9.3. The commit helper is one stub that returns false, as L75's
 * `allowTutorialSend` will veto while the models keep every button enabled. Reconnecting cannot
 * stand in for it: the same value disables these controls in the same render.
 */
import type { MirrorChoiceRequiredPayload, PlayingStateView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { makeCard, makePending, makeSelf } from '../../view-model/test-fixtures';
import type { ArenaCommit } from './arena-commit';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const vetoed = vi.hoisted(() => vi.fn<ArenaCommit>(() => false));
vi.mock('./arena-commit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arena-commit')>()),
  createArenaCommit: () => vetoed,
}));

const playView = (): PlayingStateView => makeArenaView({
  overrides: { self: makeSelf({ points: 30, hand: [makeCard('spy'), makeCard('tax'), makeCard('basic-attack')] }) },
});
function setup(overrides: Partial<ArenaScreenProps> = {}) {
  const props = makeArenaProps({ view: playView(), ...overrides });
  return { props, ...renderUi(<ArenaScreen {...props} />) };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const sheet = (name: string): HTMLElement => screen.getByRole('dialog', { name });
// PRIMARY, press, move, release, lift: copied from hand-drag-layer.test.tsx (lines 17 and 47–51).
const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const press = (element: HTMLElement, x: number, y: number): void => { fireEvent.pointerDown(element, { ...PRIMARY, clientX: x, clientY: y }); };
const move = (x: number, y: number): void => { fireEvent.pointerMove(window, { ...PRIMARY, clientX: x, clientY: y }); };
const release = (x: number, y: number): void => { fireEvent.pointerUp(window, { ...PRIMARY, clientX: x, clientY: y }); };
/** Press at (100, 700) and move 12 px up: past the threshold and mostly vertical. */
function lift(card: HTMLElement): void { press(card, 100, 700); move(103, 688); }

beforeEach(() => { vetoed.mockClear(); });

describe('a vetoed commit leaves its control live (L74 Part 2 final review, L74-25 M1)', () => {
  it('Draw stays armed: a second press commits again', async () => {
    const { user, props } = setup();
    const draw = within(region('dock')).getByRole('button', { name: /^Draw, plus / });
    await user.click(draw);
    await user.click(draw);
    expect(vetoed.mock.calls).toEqual([[{ kind: 'drawCard' }], [{ kind: 'drawCard' }]]);
    expectNoArenaIntent(props);
  });

  it('a target tap keeps targeting live, and the seat commits again', async () => {
    const { user, props } = setup();
    await user.click(handCard('Spy'));
    await user.click(within(sheet('Spy')).getByRole('button', { name: /^Use/ }));
    await user.click(within(region('arena')).getByRole('button', { name: 'p2, target' }));
    expect(screen.getByText('Choose a target')).not.toBeNull();
    await user.click(within(region('arena')).getByRole('button', { name: 'p2, target' }));
    const intent = { kind: 'playCard', payload: { instanceId: 'spy-1', targetPlayerId: 'p2' } };
    expect(vetoed.mock.calls).toEqual([[intent, { instanceId: 'spy-1' }], [intent, { instanceId: 'spy-1' }]]);
    expectNoArenaIntent(props);
  });

  it('the card sheet stays open and its Use commits again', async () => {
    const { user, props } = setup();
    await user.click(handCard('Tax'));
    await user.click(within(sheet('Tax')).getByRole('button', { name: /^Use/ }));
    await user.click(within(sheet('Tax')).getByRole('button', { name: /^Use/ }));
    const intent = { kind: 'playCard', payload: { instanceId: 'tax-1' } };
    expect(vetoed.mock.calls).toEqual([[intent, { instanceId: 'tax-1' }], [intent, { instanceId: 'tax-1' }]]);
    expectNoArenaIntent(props);
  });

  it('the Shop stays open and Buy selected commits again', async () => {
    const { user, props } = setup();
    await user.click(within(region('dock')).getByRole('button', { name: 'Shop' }));
    await user.click(within(sheet('Shop')).getByRole('button', { name: 'Buy selected' }));
    await user.click(within(sheet('Shop')).getByRole('button', { name: 'Buy selected' }));
    const intent = { kind: 'buyCard', payload: { cardId: 'basic-attack' } };
    expect(vetoed.mock.calls).toEqual([[intent], [intent]]);
    expectNoArenaIntent(props);
  });

  it("the sub-choice Confirm stays armed: a second press commits again", async () => {
    const mirror: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['e1'], deadlineMs: 40_000 };
    const view = makeArenaView({
      overrides: { pendingEffects: [makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' })] },
    });
    const { user, props } = setup({ view, subChoice: mirror });
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: 'Confirm redirect' }));
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: 'Confirm redirect' }));
    const intent = { kind: 'resolveSubChoice', payload: { kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' } };
    expect(vetoed.mock.calls).toEqual([[intent], [intent]]);
    expectNoArenaIntent(props);
  });

  it('a vetoed drop springs back: the ghost returns to the slot instead of dropping at once', () => {
    const { props } = setup();
    const seat = document.querySelector<HTMLElement>('[data-zone="opponent-seat"][data-player-id="p1"]');
    if (seat === null) throw new Error('no seat p1');
    vi.spyOn(seat, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    lift(handCard('Basic attack, 1 damage'));
    move(50, 50);
    release(50, 50);
    expect(vetoed.mock.calls).toEqual([[
      { kind: 'playCard', payload: { instanceId: 'basic-attack-1', targetPlayerId: 'p1' } },
      { instanceId: 'basic-attack-1', dropPoint: { x: 50, y: 50 } },
    ]]);
    expect(document.querySelector('[data-zone="hand-drag-ghost"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });
});
