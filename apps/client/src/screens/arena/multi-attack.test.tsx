// @vitest-environment happy-dom
/**
 * Assassin multi-attack in the card sheet: technical spec v7 §6.6.1, §6.6.2, §13 Q44; Appendix A
 * `assassin-multi-attack`, `table-multi-attack-target-eligibility` (L74-11).
 */
import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { makeCard, makePending, makePersistent, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const BASIC = 'Basic attack, 1 damage';
const STRONG = 'Strong attack, 2 damage';
const assassinSelf = (kitId: 'assassin' | 'kamikaze' = 'assassin') => makeSelf({
  kitId,
  points: 10,
  hand: [makeCard('basic-attack', { instanceId: 'atk-1' }), makeCard('strong-attack', { instanceId: 'str-1' })],
  specialCards: [makeCard('mega-attack', { instanceId: 'mega-1' })],
});
const assassinView = (overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makeArenaView({ overrides: { self: assassinSelf(), ...overrides } });
function withSeat(view: PlayingStateView, playerId: string, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch } : player)) };
}
function setup(view: PlayingStateView) {
  const onPlayMultipleAttacks = vi.fn<ArenaScreenProps['onPlayMultipleAttacks']>();
  const onPlayCard = vi.fn<ArenaScreenProps['onPlayCard']>();
  const props = makeArenaProps({ view, onPlayMultipleAttacks, onPlayCard });
  return { onPlayMultipleAttacks, onPlayCard, props, ...renderUi(<ArenaScreen {...props} />) };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const sheet = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
function reasonOf(button: HTMLElement): string {
  const ids = button.getAttribute('aria-describedby') ?? '';
  return ids.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
}
async function openMultiAttack(user: UserEvent): Promise<HTMLElement> {
  await user.click(handCard(BASIC));
  await user.click(within(sheet('Basic attack')).getByRole('button', { name: 'Multi-attack' }));
  return sheet('Assassin multi-attack');
}
/** A toggled row's seat group is named by its card (aria-labelledby is not available on Card). */
const seatIn = (dialog: HTMLElement, card: string, seat: string): HTMLElement =>
  within(within(dialog).getByRole('group', { name: card })).getByRole('button', { name: seat });

describe('Assassin multi-attack (§6.6.2)', () => {
  it('two rows on the same seat send one playMultipleAttacks with both, in hand order', async () => {
    const { user, onPlayMultipleAttacks, onPlayCard, props } = setup(assassinView());
    const dialog = await openMultiAttack(user);
    expect(within(dialog).getByText('Select at least two attack cards and a target each.')).not.toBeNull();
    await user.click(within(dialog).getByRole('button', { name: STRONG }));
    await user.click(seatIn(dialog, STRONG, 'p1'));
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(seatIn(dialog, BASIC, 'p1'));
    expectNoArenaIntent(props);
    await user.click(within(dialog).getByRole('button', { name: 'Play 2 attacks' }));
    expect(onPlayMultipleAttacks.mock.calls).toEqual([[[
      { instanceId: 'atk-1', targetPlayerId: 'p1' },
      { instanceId: 'str-1', targetPlayerId: 'p1' },
    ]]]);
    expect(onPlayCard).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Assassin multi-attack' })).toBeNull();
  });

  it('Play is disabled with one row, and with two rows until each has a target', async () => {
    const { user, props } = setup(assassinView());
    const dialog = await openMultiAttack(user);
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(seatIn(dialog, BASIC, 'p1'));
    expect(isDisabled(within(dialog).getByRole('button', { name: 'Play 1 attacks' }))).toBe(true);
    await user.click(within(dialog).getByRole('button', { name: STRONG }));
    expect(isDisabled(within(dialog).getByRole('button', { name: 'Play 2 attacks' }))).toBe(true);
    expectNoArenaIntent(props);
  });

  it('Cancel returns to the card and drops the selection: reopening shows none (Q44)', async () => {
    const { user, props } = setup(assassinView());
    let dialog = await openMultiAttack(user);
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(seatIn(dialog, BASIC, 'p1'));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(sheet('Basic attack')).not.toBeNull();
    await user.click(within(sheet('Basic attack')).getByRole('button', { name: 'Multi-attack' }));
    dialog = sheet('Assassin multi-attack');
    expect(within(dialog).getByRole('button', { name: BASIC }).getAttribute('aria-pressed')).toBe('false');
    expect(within(dialog).queryByRole('group', { name: BASIC })).toBeNull();
    expect(isDisabled(within(dialog).getByRole('button', { name: 'Play 0 attacks' }))).toBe(true);
    expectNoArenaIntent(props);
  });

  it('Esc in the multi-attack step closes the sheet; reopening the card shows the card step with nothing selected (Q44)', async () => {
    const { user, props } = setup(assassinView());
    let dialog = await openMultiAttack(user);
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(seatIn(dialog, BASIC, 'p1'));
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Assassin multi-attack' })).toBeNull();
    });
    // The closed sheet stays mounted (`closing`) and is reused: the open transition must reset it.
    await user.click(handCard(BASIC));
    expect(screen.queryByRole('dialog', { name: 'Assassin multi-attack' })).toBeNull();
    await user.click(within(sheet('Basic attack')).getByRole('button', { name: 'Multi-attack' }));
    dialog = sheet('Assassin multi-attack');
    expect(within(dialog).getByRole('button', { name: BASIC }).getAttribute('aria-pressed')).toBe('false');
    expect(within(dialog).queryByRole('group', { name: BASIC })).toBeNull();
    expectNoArenaIntent(props);
  });

  it('never lists MEGA ATTACK, and its own sheet has no Multi-attack', async () => {
    const { user, props } = setup(assassinView());
    const dialog = await openMultiAttack(user);
    expect(within(dialog).queryByRole('button', { name: /MEGA ATTACK/ })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(handCard('MEGA ATTACK, 20 damage'));
    expect(within(sheet('MEGA ATTACK')).queryByRole('button', { name: 'Multi-attack' })).toBeNull();
    expectNoArenaIntent(props);
  });

  it('a kit without multiple attacks per turn shows no Multi-attack (Kamikaze)', async () => {
    const { user } = setup(makeArenaView({ overrides: { self: assassinSelf('kamikaze') } }));
    await user.click(handCard(BASIC));
    expect(within(sheet('Basic attack')).queryByRole('button', { name: 'Multi-attack' })).toBeNull();
  });

  it("rows offer the model's attack seats: a riposte corpse, never a living Invisible seat", async () => {
    const base = makeArenaView({
      seatCount: 4,
      tiers: { p2: 'eliminated' },
      overrides: {
        self: assassinSelf(),
        pendingEffects: [makePending({ id: 'atk-p2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack' })],
      },
    });
    const view = withSeat(base, 'p3', { activePersistentEffects: [makePersistent({ id: 'inv-p3', cardId: 'invisibility', counter: 2 })] });
    const { user, props } = setup(view);
    const dialog = await openMultiAttack(user);
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    const group = within(dialog).getByRole('group', { name: BASIC });
    expect(within(group).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['p1', 'p2, eliminated']);
    expectNoArenaIntent(props);
  });

  it('off-turn the Multi-attack entry is disabled with its reason', async () => {
    const { user, props } = setup(assassinView({ currentTurnPlayerId: 'p1' }));
    await user.click(handCard(BASIC));
    const entry = within(sheet('Basic attack')).getByRole('button', { name: 'Multi-attack' });
    expect(isDisabled(entry)).toBe(true);
    expect(reasonOf(entry)).toBe(DISABLED_REASON_COPY['not-your-turn']);
    expectNoArenaIntent(props);
  });

  it('a double tap on Play sends one intent', async () => {
    const { user, onPlayMultipleAttacks } = setup(assassinView());
    const dialog = await openMultiAttack(user);
    await user.click(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(seatIn(dialog, BASIC, 'p2'));
    await user.click(within(dialog).getByRole('button', { name: STRONG }));
    await user.click(seatIn(dialog, STRONG, 'p1'));
    await user.dblClick(within(dialog).getByRole('button', { name: 'Play 2 attacks' }));
    expect(onPlayMultipleAttacks).toHaveBeenCalledTimes(1);
  });
});

describe('multi-attack step focus (final review, I2)', () => {
  it('entering the step focuses the first row toggle, and Cancel focuses the Multi-attack entry', async () => {
    const { user, props } = setup(assassinView());
    const dialog = await openMultiAttack(user);
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: BASIC }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(within(sheet('Basic attack')).getByRole('button', { name: 'Multi-attack' }));
    expectNoArenaIntent(props);
  });

  it('a model reset focuses the first enabled action once the entry is gone (the hand fell below two attacks)', async () => {
    const { user, rerender, props } = setup(assassinView());
    await openMultiAttack(user);
    const oneAttack = makeArenaView({ overrides: { self: makeSelf({ kitId: 'assassin', points: 10, hand: [makeCard('basic-attack', { instanceId: 'atk-1' })] }) } });
    rerender(<ArenaScreen {...props} view={oneAttack} />);
    const card = sheet('Basic attack');
    expect(within(card).queryByRole('button', { name: 'Multi-attack' })).toBeNull();
    expect(document.activeElement).toBe(within(card).getByRole('button', { name: /^Use/ }));
    expectNoArenaIntent(props);
  });

  it('a model reset focuses the panel when the card left the hand and the sheet turned read-only', async () => {
    const { user, rerender, props } = setup(assassinView());
    await openMultiAttack(user);
    const withoutCard = makeArenaView({ overrides: { self: makeSelf({ kitId: 'assassin', points: 10, hand: [makeCard('strong-attack', { instanceId: 'str-1' })] }) } });
    rerender(<ArenaScreen {...props} view={withoutCard} />);
    const card = sheet('Basic attack');
    expect(within(card).queryAllByRole('button', { name: /^(Use|Multi-attack)/ })).toEqual([]);
    expect(document.activeElement).toBe(card);
    expectNoArenaIntent(props);
  });
});
