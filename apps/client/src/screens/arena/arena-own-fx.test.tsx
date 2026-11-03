// @vitest-environment happy-dom
/**
 * Own-intent FX leave from the commit helper: technical spec v7 §6.6.2, §6.6.3, §6.12; Lot 74 plan A.9.3
 * (L74-17). The shared hook is mocked, so each commit path's flight request is read directly.
 */
import type { PlayingStateView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import type { OwnIntentFx } from '../../view-model/fx-triggers';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen } from './arena-screen';
import { makeArenaProps, makeArenaView } from './test-view';

const ownIntent = vi.hoisted(() => vi.fn<(fx: OwnIntentFx) => void>());
vi.mock('../../fx/use-table-fx-triggers', () => ({ useTableFxTriggers: () => ({ ownIntent }) }));

const playView = (): PlayingStateView => makeArenaView({
  overrides: { self: makeSelf({ points: 30, upgradePoints: 1, hand: [makeCard('spy'), makeCard('tax'), makeCard('basic-attack')] }) },
});
function setup() {
  const props = makeArenaProps({ view: playView() });
  return { props, ...renderUi(<ArenaScreen {...props} />, { reducedMotion: true }) };
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

beforeEach(() => { ownIntent.mockClear(); });

describe('own-intent FX (L74-17, A.9.3)', () => {
  it('a target tap flies the targeted hand card (§6.6.2)', async () => {
    const { user, props } = setup();
    await user.click(handCard('Spy'));
    await user.click(within(sheet('Spy')).getByRole('button', { name: /^Use/ }));
    await user.click(within(region('arena')).getByRole('button', { name: 'p2, target' }));
    expect(vi.mocked(props.onPlayCard).mock.calls).toEqual([['spy-1', { targetPlayerId: 'p2' }]]);
    expect(ownIntent.mock.calls).toEqual([[{ kind: 'play', instanceId: 'spy-1' }]]);
  });

  it('a drop flies the card from where it was released (§6.6.3)', () => {
    const { props } = setup();
    const plate = document.querySelector<HTMLElement>('[data-zone="pending"]');
    if (plate === null) throw new Error('no plate');
    vi.spyOn(plate, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 300, 120, 96));
    lift(handCard('Tax'));
    release(150, 340);
    expect(vi.mocked(props.onPlayCard).mock.calls).toEqual([['tax-1']]);
    expect(ownIntent.mock.calls).toEqual([[{ kind: 'play', instanceId: 'tax-1', origin: { x: 150, y: 340 } }]]);
  });

  it('a sheet Sell flies the sold card; Upgrade and Draw fly nothing', async () => {
    const { user, props } = setup();
    await user.click(handCard('Basic attack, 1 damage'));
    await user.click(within(sheet('Basic attack')).getByRole('button', { name: /^Upgrade/ }));
    await user.click(handCard('Spy'));
    await user.click(within(sheet('Spy')).getByRole('button', { name: /^Sell/ }));
    await user.click(within(region('dock')).getByRole('button', { name: /^Draw, plus / }));
    expect([props.onUpgradeCard, props.onSellCard, props.onDraw].map((spy) => vi.mocked(spy).mock.calls.length)).toEqual([1, 1, 1]);
    expect(ownIntent.mock.calls).toEqual([[{ kind: 'sell', instanceId: 'spy-1' }]]);
  });
});
