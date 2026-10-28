// @vitest-environment happy-dom
/**
 * Tap-tap targeting and pre-send choices: technical spec v7 §6.6.2, §6.6.4, §6.6.5; Appendix A
 * `card-target-picker`, `table-target-picker-eligibility`, `table-use-target-routing`,
 * `regeneration-quantity-picker`, `card-transformer-consume-picker` (L74-10).
 */
import type { PlayingStateView, PublicPlayerView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { act, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../test/render';
import { DUR_BASE_MS } from '../../ui/motion/motion-tokens';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { makeCard, makePending, makePersistent, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

function withSeat(view: PlayingStateView, playerId: string, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch } : player)) };
}
const SPY_AND_ATTACK = [makeCard('spy', { instanceId: 'spy-1' }), makeCard('basic-attack', { instanceId: 'atk-1' })];
/** Me, p1, p2; 10 points; Spy and Basic attack in hand. */
const playView = (): PlayingStateView => makeArenaView({ overrides: { self: makeSelf({ points: 10, hand: SPY_AND_ATTACK }) } });
/** p1 living Invisible, p2 living, p3 a corpse with nothing pending, p4 a corpse whose attack is pending on me. */
function eligibilityView(): PlayingStateView {
  const base = makeArenaView({
    seatCount: 5,
    tiers: { p3: 'eliminated', p4: 'eliminated' },
    overrides: {
      self: makeSelf({ points: 10, hand: SPY_AND_ATTACK }),
      pendingEffects: [makePending({ id: 'atk-p4', sourcePlayerId: 'p4', targetPlayerId: 'me', cardId: 'basic-attack' })],
    },
  });
  return withSeat(base, 'p1', { activePersistentEffects: [makePersistent({ id: 'inv-p1', cardId: 'invisibility', counter: 3 })] });
}
function setup(view: PlayingStateView, overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const onPlayCard = vi.fn<ArenaScreenProps['onPlayCard']>();
  const props = makeArenaProps({ view, onPlayCard, ...overrides });
  return { onPlayCard, props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const sheet = (name: string | RegExp): HTMLElement => screen.getByRole('dialog', { name });
/** A valid seat while targeting (§6.6.5). */
const target = (nickname: string): HTMLElement => within(region('arena')).getByRole('button', { name: `${nickname}, target` });
/** A seat's control outside targeting: its accessible name is the nickname (L74-04 Review Focus 5). */
const seatButton = (nickname: string): HTMLElement => within(region('arena')).getByRole('button', { name: nickname });
/** The seat's `<button>` (L74-04), which L74-10 marks while targeting, valid or not. */
function marked(playerId: string): HTMLElement {
  const seat = document.querySelector<HTMLElement>(`[data-zone="opponent-seat"][data-player-id="${playerId}"]`);
  if (seat === null) throw new Error(`no seat ${playerId}`);
  const control = seat.querySelector<HTMLElement>('button[data-target-seat]');
  if (control === null) throw new Error(`seat ${playerId} is not marked for targeting`);
  return control;
}
const barShown = (): boolean => screen.queryByText('Choose a target') !== null;
const anyMarked = (): boolean => document.querySelector('[data-target-seat]') !== null;
async function useCard(user: UserEvent, cardName: string, sheetName: string | RegExp): Promise<void> {
  await user.click(handCard(cardName));
  await user.click(within(sheet(sheetName)).getByRole('button', { name: /^Use/ }));
}

describe('tap-tap targeting (§6.6.2, §6.6.5)', () => {
  it('Use on Spy collapses the sheet into the bar, offers the seats and sends nothing', async () => {
    const { user, props } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    expect(screen.getByText('Choose a target').closest('[data-zone="sheet-bar"]')).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    expect([target('p1').getAttribute('data-target-seat'), target('p2').getAttribute('data-target-seat')]).toEqual(['valid', 'valid']);
    expect(document.activeElement).toBe(target('p1'));
    expectNoArenaIntent(props);
  });

  it('a valid seat tap sends one playCard with targetPlayerId and ends targeting', async () => {
    const { user, onPlayCard } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    await user.click(target('p2'));
    expect(onPlayCard.mock.calls).toEqual([['spy-1', { targetPlayerId: 'p2' }]]);
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
  });

  it('a double tap on a target sends one intent and opens no seat sheet (Review Focus 3)', async () => {
    const { user, onPlayCard } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    await user.dblClick(target('p2'));
    expect(onPlayCard).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'p2' })).toBeNull();
  });

  it.each(['Cancel', 'Escape'] as const)('%s ends targeting, sends nothing and restores the hand', async (how) => {
    const { user, props } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    expect(barShown()).toBe(true);
    if (how === 'Cancel') {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    } else {
      await user.keyboard('{Escape}');
    }
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    expect(handCard('Spy').getAttribute('aria-pressed')).toBe('false');
    expectNoArenaIntent(props);
  });

  it('opening another card ends targeting', async () => {
    const { user, props } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    expect(barShown()).toBe(true);
    await user.click(handCard('Basic attack, 1 damage'));
    expect(sheet('Basic attack')).not.toBeNull();
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    expectNoArenaIntent(props);
  });

  it('tapping the targeted hand card again ends targeting and shows its sheet expanded, not as a bar', async () => {
    const { user, props } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    expect(barShown()).toBe(true);
    await user.click(handCard('Spy'));
    expect(sheet('Spy')).not.toBeNull();
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    expect(document.querySelector('[data-zone="sheet-bar"]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('ignores seat taps for DUR_BASE_MS after targeting ends (frontend.md "L74 carry-overs")', async () => {
    vi.useFakeTimers();
    const { user, props } = setup(playView(), {}, { advanceTimers: vi.advanceTimersByTime });
    await useCard(user, 'Spy', 'Spy');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(seatButton('p1'));
    expect(screen.queryByRole('dialog', { name: 'p1' })).toBeNull();
    act(() => { vi.advanceTimersByTime(DUR_BASE_MS); });
    await user.click(seatButton('p1'));
    expect(sheet('p1')).not.toBeNull();
    expectNoArenaIntent(props);
  });
});

describe('target eligibility comes from the model (Appendix A table-target-picker-eligibility)', () => {
  it('Spy: the living Invisible seat and both corpses are aria-disabled and inert', async () => {
    const { user, props } = setup(eligibilityView());
    await useCard(user, 'Spy', 'Spy');
    expect(document.activeElement).toBe(target('p2'));
    for (const playerId of ['p1', 'p3', 'p4']) {
      const seat = marked(playerId);
      expect([seat.getAttribute('data-target-seat'), seat.getAttribute('aria-disabled')]).toEqual(['invalid', 'true']);
      await user.click(seat);
    }
    expectNoArenaIntent(props);
    expect(barShown()).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Basic attack: the corpse with an attack pending on you is valid, the other corpse is not (L68-07)', async () => {
    const { user, onPlayCard } = setup(eligibilityView());
    await useCard(user, 'Basic attack, 1 damage', 'Basic attack');
    expect([marked('p2').getAttribute('data-target-seat'), marked('p4').getAttribute('data-target-seat')]).toEqual(['valid', 'valid']);
    expect([marked('p1').getAttribute('aria-disabled'), marked('p3').getAttribute('aria-disabled')]).toEqual(['true', 'true']);
    await user.click(target('p4'));
    expect(onPlayCard.mock.calls).toEqual([['atk-1', { targetPlayerId: 'p4' }]]);
  });

  it('upgraded Card Thief plays at once with no target and no bar (L66-01)', async () => {
    const view = makeArenaView({
      overrides: { self: makeSelf({ points: 10, specialCards: [makeCard('card-thief', { instanceId: 'thief-1', isUpgraded: true })] }) },
    });
    const { user, onPlayCard } = setup(view);
    await useCard(user, 'Card Thief upgraded', /^Card Thief/);
    expect(onPlayCard.mock.calls).toEqual([['thief-1']]);
    expect([barShown(), anyMarked()]).toEqual([false, false]);
  });
});

describe('targeting ends when its model goes stale (Review Focus 2)', () => {
  it('a sub-choice opening ends targeting for good; a later seat tap sends nothing', async () => {
    const { user, props, rerender } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    rerender(<ArenaScreen {...props} subChoice={MIRROR} />);
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    expect(screen.queryByRole('dialog', { name: 'Spy' })).toBeNull();
    await user.click(seatButton('p2'));
    rerender(<ArenaScreen {...props} />);
    expect(barShown()).toBe(false);
    expectNoArenaIntent(props);
  });

  it('the turn passing ends targeting for good', async () => {
    const { user, props, rerender } = setup(playView());
    await useCard(user, 'Spy', 'Spy');
    expect(barShown()).toBe(true);
    rerender(<ArenaScreen {...props} view={{ ...props.view, currentTurnPlayerId: 'p1' }} />);
    expect([barShown(), anyMarked()]).toEqual([false, false]);
    await user.click(seatButton('p2'));
    rerender(<ArenaScreen {...props} />);
    expect(barShown()).toBe(false);
    expectNoArenaIntent(props);
  });
});

describe('pre-send choices in the sheet (§6.6.2)', () => {
  const regenView = (points: number): PlayingStateView =>
    makeArenaView({ overrides: { self: makeSelf({ points, hand: [makeCard('regeneration', { instanceId: 'regen-1' })] }) } });

  it('Regeneration preselects 1 life; picking 3 lives only selects until Use sends quantity 3', async () => {
    const { user, onPlayCard, props } = setup(regenView(12));
    await user.click(handCard('Regeneration'));
    const group = within(sheet('Regeneration')).getByRole('group', { name: 'Regeneration quantity' });
    const one = within(group).getByRole('button', { name: '1 life, minus 3 pts' });
    expect(one.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(one);
    const three = within(group).getByRole('button', { name: '3 lives, minus 9 pts' });
    await user.click(three);
    expect([one.getAttribute('aria-pressed'), three.getAttribute('aria-pressed')]).toEqual(['false', 'true']);
    expectNoArenaIntent(props);
    await user.click(within(sheet('Regeneration')).getByRole('button', { name: /^Use/ }));
    expect(onPlayCard.mock.calls).toEqual([['regen-1', { quantity: 3 }]]);
  });

  it('Regeneration disables the quantities the POV cannot pay for', async () => {
    const { user, props } = setup(regenView(7));
    await user.click(handCard('Regeneration'));
    const group = within(sheet('Regeneration')).getByRole('group', { name: 'Regeneration quantity' });
    const names = ['1 life, minus 3 pts', '2 lives, minus 6 pts', '3 lives, minus 9 pts', '4 lives, minus 12 pts'];
    expect(names.map((name) => within(group).getByRole('button', { name }).hasAttribute('disabled'))).toEqual([false, false, true, true]);
    expectNoArenaIntent(props);
  });

  it('Card Transformer preselects the first shared card and Use sends the chosen consumeInstanceId', async () => {
    const view = makeArenaView({
      overrides: {
        self: makeSelf({
          points: 5,
          hand: [makeCard('basic-attack', { instanceId: 'atk-1' }), makeCard('tax', { instanceId: 'tax-1' })],
          specialCards: [makeCard('card-transformer', { instanceId: 'tf-1' })],
        }),
      },
    });
    const { user, onPlayCard, props } = setup(view);
    await user.click(handCard('Card Transformer'));
    const group = within(sheet('Card Transformer')).getByRole('group', { name: 'Choose a card to transform' });
    expect(within(group).getByRole('button', { name: 'Basic attack, 1 damage' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(group).getByRole('button', { name: 'Tax' }));
    expectNoArenaIntent(props);
    await user.click(within(sheet('Card Transformer')).getByRole('button', { name: /^Use/ }));
    expect(onPlayCard.mock.calls).toEqual([['tf-1', { consumeInstanceId: 'tax-1' }]]);
  });

  it('Card Transformer with nothing to consume shows its reason once and no tiles', async () => {
    const view = makeArenaView({ overrides: { self: makeSelf({ points: 5, specialCards: [makeCard('card-transformer', { instanceId: 'tf-1' })] }) } });
    const { user } = setup(view);
    await user.click(handCard('Card Transformer'));
    const dialog = sheet('Card Transformer');
    expect(within(dialog).queryByRole('group', { name: 'Choose a card to transform' })).toBeNull();
    expect(within(dialog).getAllByText(DISABLED_REASON_COPY['nothing-to-consume'])).toHaveLength(1);
  });
});
