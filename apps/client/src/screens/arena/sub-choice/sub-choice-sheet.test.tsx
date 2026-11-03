// @vitest-environment happy-dom
/**
 * The sub-choice host, Mirror and elimination reward: technical spec v7 §6.7, §13 Q55 / Q58 / Q59,
 * §14.2; Appendix A `table-subchoice-host`, `table-sub-choice-non-dismissible`,
 * `table-sub-choice-timer-scale`, `table-subchoice-mirror`, `table-subchoice-reward`; Lot 74 Part 2
 * Review Focus 1 and 2 (L74-18).
 */
import {
  listedAttackDamage, type MirrorChoiceRequiredPayload, type PlayingStateView, type RewardChoiceRequiredPayload,
} from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../../test/render';
import { MINIMIZE_LABEL } from '../../../ui/ui-copy';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { SHOP_ACTION_LABEL } from '../../../view-model/chrome-labels';
import { makeCard, makePending, makePersistent, makeSelf } from '../../../view-model/test-fixtures';
import { ILLEGAL_ACTION_COPY } from '../../illegal-action-copy';
import type { ArenaCommit } from '../arena-commit';
import { ArenaScreen, type ArenaScreenProps } from '../arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from '../test-view';
import { SubChoiceSheet } from './sub-choice-sheet';

const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const MIRROR: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['e1', 'e2'], deadlineMs: 40_000 };
const NO_ATTACK: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 40_000 };
const SPY = makeCard('spy', { instanceId: 'r-spy' });
const THIEF = makeCard('thief', { instanceId: 'r-thief' });
const TAX = makeCard('tax', { instanceId: 'r-tax' });
const REWARD: RewardChoiceRequiredPayload = {
  kind: 'elimination-reward', eliminationId: 'el-1', eliminatedPlayerId: 'p1', availableCards: [SPY, THIEF, TAX], deadlineMs: 40_000,
};
const UNAVAILABLE = ILLEGAL_ACTION_COPY['reward-card-unavailable'].body;
const ALREADY_CHOSEN = ILLEGAL_ACTION_COPY['reward-card-already-chosen'].body;

/** Me, p1 (Invisible), p2, p3 (eliminated); e1 p1 → me, e2 p2 → me ×2, e3 p1 → p2. */
function mirrorView(): PlayingStateView {
  const base = makeArenaView({ seatCount: 4, tiers: { p3: 'eliminated' }, overrides: { pendingEffects: [
    makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'strong-attack', damageMultiplier: 2 }),
    makePending({ id: 'e3', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' }),
  ] } });
  const invisible = makePersistent({ id: 'inv-p1', cardId: 'invisibility', counter: 3 });
  return { ...base, players: base.players.map((player) => (player.id === 'p1' ? { ...player, activePersistentEffects: [invisible] } : player)) };
}
const handView = (cardId: 'spy' | 'basic-attack'): PlayingStateView =>
  makeArenaView({ overrides: { self: makeSelf({ points: 30, hand: [makeCard(cardId, { instanceId: 'held-1' })] }) } });
function setup(overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const onResolveSubChoice = vi.fn<ArenaScreenProps['onResolveSubChoice']>();
  const props = makeArenaProps({ view: mirrorView(), onResolveSubChoice, ...overrides });
  return { onResolveSubChoice, props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function anchor(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}
const region = (name: string): HTMLElement => anchor(`[data-arena-region="${name}"]`);
const sheet = (name: string): HTMLElement => screen.getByRole('dialog', { name });
function overlayOf(panel: HTMLElement): HTMLElement {
  const overlay = panel.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) throw new Error('no sheet overlay');
  return overlay;
}
const z = (element: HTMLElement): number => Number(element.style.zIndex);
const choice = (dialog: HTMLElement, n: 1 | 2): HTMLElement => within(dialog).getByRole('group', { name: `Choice ${String(n)}` });
const confirmRewards = (dialog: HTMLElement): HTMLElement => within(dialog).getByRole('button', { name: 'Confirm rewards' });

describe('sub-choice host (§6.7, L30-03)', () => {
  it("shows the kind title, its expiry hint and a draining 'Sub-choice timer'; the reward sheet keeps its hint anchor", () => {
    const { props, rerender } = setup({ subChoice: MIRROR });
    const dialog = sheet('Mirror redirect');
    expect([dialog.getAttribute('data-sheet-mode'), dialog.getAttribute('data-sub-choice')]).toEqual(['blocking', 'mirror']);
    expect(within(dialog).getByText('On expiry: a random eligible redirect', { exact: false })).not.toBeNull();
    expect(within(dialog).getByText('40s left')).not.toBeNull();
    const timer = within(dialog).getByRole('progressbar', { name: 'Sub-choice timer' });
    expect(timer.getAttribute('aria-valuenow')).toBe('100');
    rerender(<ArenaScreen {...props} nowMs={20_000} />);
    expect([within(dialog).getByText('20s left').textContent, timer.getAttribute('aria-valuenow')]).toEqual(['20s left', '50']);
    expect(dialog.hasAttribute('data-hint-anchor')).toBe(false);
    rerender(<ArenaScreen {...props} subChoice={REWARD} />);
    const reward = sheet('Elimination reward');
    expect(reward.getAttribute('data-hint-anchor')).toBe('reward');
    expect(within(reward).getByText('2×4 lives')).not.toBeNull();
  });

  it('never closes or resolves on Esc or a backdrop press', async () => {
    const { user, props } = setup({ subChoice: MIRROR });
    const dialog = sheet('Mirror redirect');
    await user.keyboard('{Escape}');
    await user.click(overlayOf(dialog));
    expect(sheet('Mirror redirect')).toBe(dialog);
    expectNoArenaIntent(props);
  });

  it("shows \"Time's up\" at 0 s and Confirm still sends (Q58)", async () => {
    const { user, onResolveSubChoice } = setup({ subChoice: MIRROR, nowMs: 41_000 });
    const dialog = sheet('Mirror redirect');
    expect(within(dialog).getByText("Time's up")).not.toBeNull();
    expect(within(dialog).getByRole('progressbar', { name: 'Sub-choice timer' }).getAttribute('aria-valuenow')).toBe('0');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm redirect' }));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' }]]);
  });

  it('Minimize keeps intents locked and keeps the bar above a later read-only sheet (Q59)', async () => {
    const { user, props } = setup({ subChoice: MIRROR }, { reducedMotion: true });
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: MINIMIZE_LABEL }));
    expect(screen.queryByRole('dialog', { name: 'Mirror redirect' })).toBeNull();
    expect(anchor('[data-arena="next"]').getAttribute('data-action-lock')).toBe('actions-locked');
    const draw = within(region('dock')).getByRole('button', { name: /^Draw, plus / });
    expect(draw.getAttribute('aria-disabled')).toBe('true');
    await user.click(draw);
    await user.click(within(region('arena')).getByRole('button', { name: 'p2' }));
    expect(z(anchor('[data-zone="sheet-bar"]'))).toBeGreaterThan(z(overlayOf(sheet('p2'))));
    expect(screen.getByRole('button', { name: 'Mirror redirect' })).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('closes when subChoice clears, and a resend reopens it expanded', async () => {
    const { user, props, rerender } = setup({ subChoice: MIRROR }, { reducedMotion: true });
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: MINIMIZE_LABEL }));
    rerender(<ArenaScreen {...props} subChoice={null} />);
    expect(screen.queryByRole('dialog', { name: 'Mirror redirect' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mirror redirect' })).toBeNull();
    rerender(<ArenaScreen {...props} subChoice={{ ...MIRROR }} />);
    expect(sheet('Mirror redirect').getAttribute('aria-modal')).toBe('true');
    expectNoArenaIntent(props);
  });

  it('locked disables Confirm with its reason and sends nothing; Minimize stays usable; unlocking sends once (A.9.4)', async () => {
    const commit = vi.fn<ArenaCommit>(() => true);
    const base = { subChoice: MIRROR, view: mirrorView(), nowMs: 0, commit, actionReject: null } as const;
    const { user, rerender } = renderUi(<SubChoiceSheet {...base} locked />, { reducedMotion: true });
    const dialog = sheet('Mirror redirect');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm redirect', description: DISABLED_REASON_COPY['actions-locked'] });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await user.click(confirm);
    expect(within(dialog).getByRole('button', { name: MINIMIZE_LABEL }).hasAttribute('disabled')).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    rerender(<SubChoiceSheet {...base} locked={false} />);
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: 'Confirm redirect' }));
    expect(commit.mock.calls).toEqual([[{ kind: 'resolveSubChoice', payload: { kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' } }]]);
  });
});

describe('a sub-choice arriving mid-interaction (Part 2 Review Focus 1)', () => {
  it('ends targeting and takes focus on top; a later seat tap sends nothing', async () => {
    const { user, props, rerender } = setup({ view: handView('spy') });
    await user.click(within(region('hand')).getByRole('button', { name: 'Spy' }));
    await user.click(within(sheet('Spy')).getByRole('button', { name: /^Use/ }));
    expect(document.querySelector('[data-zone="targeting-bar"]')).not.toBeNull();
    rerender(<ArenaScreen {...props} subChoice={NO_ATTACK} />);
    expect(document.querySelector('[data-zone="targeting-bar"]')).toBeNull();
    expect(sheet('Mirror redirect').contains(document.activeElement)).toBe(true);
    await user.click(within(region('arena')).getByRole('button', { name: 'p1' }));
    expectNoArenaIntent(props);
  });

  it('paints above an open seat sheet, and Esc closes neither', async () => {
    const { user, props, rerender } = setup({ view: makeArenaView() });
    await user.click(within(region('arena')).getByRole('button', { name: 'p1' }));
    const seatSheet = sheet('p1');
    rerender(<ArenaScreen {...props} subChoice={NO_ATTACK} />);
    const blocking = sheet('Mirror redirect');
    expect(z(overlayOf(blocking))).toBeGreaterThan(z(overlayOf(seatSheet)));
    expect(overlayOf(seatSheet).hasAttribute('inert')).toBe(true);
    await user.keyboard('{Escape}');
    expect([sheet('p1'), sheet('Mirror redirect')]).toEqual([seatSheet, blocking]);
    expectNoArenaIntent(props);
  });

  it('stops a lifted drag: no zone lights, the release springs back and sends nothing', () => {
    const { props, rerender } = setup({ view: handView('basic-attack') }, { reducedMotion: true });
    const seat = anchor('[data-zone="opponent-seat"][data-player-id="p1"]');
    vi.spyOn(seat, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    fireEvent.pointerDown(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, clientX: 100, clientY: 700 });
    fireEvent.pointerMove(window, { ...PRIMARY, clientX: 103, clientY: 688 });
    fireEvent.pointerMove(window, { ...PRIMARY, clientX: 50, clientY: 50 });
    expect(seat.getAttribute('data-drop')).toBe('over');
    rerender(<ArenaScreen {...props} subChoice={NO_ATTACK} />);
    expect(sheet('Mirror redirect')).not.toBeNull();
    expect(seat.hasAttribute('data-drop')).toBe(false);
    fireEvent.pointerUp(window, { ...PRIMARY, clientX: 50, clientY: 50 });
    expect(document.querySelector('[data-zone="hand-drag-ghost"]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('locks a Shop selection: Buy and a tile double tap send nothing', async () => {
    const { user, props, rerender } = setup({ view: makeArenaView({ overrides: { self: makeSelf({ points: 30 }) } }) });
    await user.click(within(region('dock')).getByRole('button', { name: SHOP_ACTION_LABEL }));
    const shop = anchor('[data-arena-sheet="shop"]');
    const [tile] = within(shop).getAllByRole('button', { pressed: false });
    if (tile === undefined) throw new Error('no shop tile');
    await user.click(tile);
    rerender(<ArenaScreen {...props} subChoice={NO_ATTACK} />);
    expect(sheet('Mirror redirect')).not.toBeNull();
    expect(overlayOf(shop).hasAttribute('inert')).toBe(true);
    for (const buy of within(shop).queryAllByRole('button', { name: /^Buy/ })) await user.click(buy);
    await user.dblClick(tile);
    expectNoArenaIntent(props);
  });
});

describe('Mirror (§6.7, L44-03, L56-04)', () => {
  it('offers only the eligible attacks and the living opponents, Invisible included, both preselected, and sends one redirect', async () => {
    const { user, onResolveSubChoice } = setup({ subChoice: MIRROR });
    const dialog = sheet('Mirror redirect');
    expect(within(dialog).getByText('Choose which pending attack to redirect and its new target.')).not.toBeNull();
    const attacks = within(within(dialog).getByRole('group', { name: 'Pending attack' })).getAllByRole('button');
    expect(attacks.map((tile) => [tile.getAttribute('aria-label'), tile.getAttribute('aria-pressed')]))
      .toEqual([["p1's Basic attack → you", 'true'], ["p2's Strong attack → you", 'false']]);
    expect(attacks[1]?.querySelector('[data-card-chip="damage"]')?.textContent).toBe(String(listedAttackDamage('strong-attack', false, 2)));
    const targets = within(within(dialog).getByRole('group', { name: 'New target' })).getAllByRole('button');
    expect(targets.map((seat) => [seat.getAttribute('aria-label'), seat.getAttribute('aria-pressed')])).toEqual([['p1', 'true'], ['p2', 'false']]);
    await user.click(within(dialog).getByRole('button', { name: "p2's Strong attack → you" }));
    await user.click(within(dialog).getByRole('button', { name: 'p2' }));
    const confirm = within(dialog).getByRole('button', { name: 'Confirm redirect' });
    await user.click(confirm);
    await user.click(confirm);
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'mirror', pendingEffectId: 'e2', newTargetPlayerId: 'p2' }]]);
  });

  it('falls back to the first eligible attack when a resend drops the picked one', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup({ subChoice: MIRROR });
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: "p2's Strong attack → you" }));
    rerender(<ArenaScreen {...props} subChoice={{ ...MIRROR, eligibleEffectIds: ['e1'] }} />);
    const dialog = sheet('Mirror redirect');
    expect(within(dialog).queryByRole('button', { name: "p2's Strong attack → you" })).toBeNull();
    expect(within(dialog).getByRole('button', { name: "p1's Basic attack → you" }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm redirect' }));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' }]]);
  });

  it("opens a prompt that follows a clear with a fresh picker, not the earlier prompt's redirect target", async () => {
    const { user, props, rerender } = setup({ subChoice: MIRROR }, { reducedMotion: true });
    await user.click(within(sheet('Mirror redirect')).getByRole('button', { name: 'p2' }));
    expect(within(sheet('Mirror redirect')).getByRole('button', { name: 'p2' }).getAttribute('aria-pressed')).toBe('true');
    rerender(<ArenaScreen {...props} subChoice={null} />);
    rerender(<ArenaScreen {...props} subChoice={{ ...MIRROR }} />);
    const dialog = sheet('Mirror redirect');
    expect(['p1', 'p2'].map((name) => within(dialog).getByRole('button', { name }).getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expectNoArenaIntent(props);
  });

  it('re-arms the answer latch on a resend: Confirm, a resent prompt, Confirm sends twice (final review)', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup({ subChoice: MIRROR });
    const confirm = (): HTMLElement => within(sheet('Mirror redirect')).getByRole('button', { name: 'Confirm redirect' });
    await user.click(confirm());
    await user.click(confirm());
    expect(onResolveSubChoice).toHaveBeenCalledTimes(1);
    rerender(<ArenaScreen {...props} subChoice={{ ...MIRROR }} />);
    await user.click(confirm());
    const redirect = { kind: 'mirror', pendingEffectId: 'e1', newTargetPlayerId: 'p1' };
    expect(onResolveSubChoice.mock.calls).toEqual([[redirect], [redirect]]);
  });
});

describe('elimination reward (§6.7, Q55, L44-06)', () => {
  it('two radiogroups default to lives and points, and Confirm sends them', async () => {
    const { user, onResolveSubChoice } = setup({ subChoice: REWARD });
    const dialog = sheet('Elimination reward');
    expect(within(dialog).getByText('Pick two rewards from p1.')).not.toBeNull();
    for (const n of [1, 2] as const) {
      expect(within(choice(dialog, n)).getAllByRole('radio').map((radio) => radio.textContent))
        .toEqual(['4 lives', '8 points', '1 upgrade point', 'A card']);
    }
    expect(within(choice(dialog, 1)).getByRole('radio', { name: '4 lives' }).getAttribute('aria-checked')).toBe('true');
    expect(within(choice(dialog, 2)).getByRole('radio', { name: '8 points' }).getAttribute('aria-checked')).toBe('true');
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    await user.click(confirmRewards(dialog));
    expect(onResolveSubChoice.mock.calls).toEqual([[{ kind: 'elimination-reward', eliminationId: 'el-1', choices: [{ type: 'lives' }, { type: 'points' }] }]]);
  });

  it('sends two different cards; the same card twice is blocked', async () => {
    const { user, onResolveSubChoice } = setup({ subChoice: REWARD });
    const dialog = sheet('Elimination reward');
    await user.click(within(choice(dialog, 1)).getByRole('radio', { name: 'A card' }));
    expect(within(choice(dialog, 1)).getByRole('button', { name: 'Spy' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(choice(dialog, 2)).getByRole('radio', { name: 'A card' }));
    expect(within(choice(dialog, 2)).getByRole('button', { name: 'Thief' }).getAttribute('aria-pressed')).toBe('true');
    const takenSpy = within(choice(dialog, 2)).getByRole('button', { name: 'Spy', description: ALREADY_CHOSEN });
    expect(takenSpy.getAttribute('aria-disabled')).toBe('true');
    await user.click(takenSpy);
    expect(takenSpy.getAttribute('aria-pressed')).toBe('false');
    await user.click(confirmRewards(dialog));
    expect(onResolveSubChoice.mock.calls).toEqual([[{
      kind: 'elimination-reward', eliminationId: 'el-1', choices: [{ type: 'card', instanceId: 'r-spy' }, { type: 'card', instanceId: 'r-thief' }],
    }]]);
  });

  it('greys a card a refreshed prompt no longer offers and keeps a still-offered pick (Review Focus 2)', async () => {
    const { user, props, rerender, onResolveSubChoice } = setup({ subChoice: REWARD });
    let dialog = sheet('Elimination reward');
    await user.click(within(choice(dialog, 1)).getByRole('radio', { name: 'A card' }));
    await user.click(within(choice(dialog, 2)).getByRole('radio', { name: 'A card' }));
    rerender(<ArenaScreen {...props} subChoice={{ ...REWARD, availableCards: [SPY, TAX] }} />);
    dialog = sheet('Elimination reward');
    expect(within(choice(dialog, 1)).getByRole('button', { name: 'Spy' }).getAttribute('aria-pressed')).toBe('true');
    const goneThief = within(choice(dialog, 2)).getByRole('button', { name: 'Thief', description: UNAVAILABLE });
    expect(goneThief.getAttribute('aria-disabled')).toBe('true');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm rewards', description: UNAVAILABLE });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await user.click(confirm);
    expectNoArenaIntent(props);
    await user.click(within(choice(dialog, 2)).getByRole('button', { name: 'Tax' }));
    await user.click(confirmRewards(dialog));
    expect(onResolveSubChoice.mock.calls).toEqual([[{
      kind: 'elimination-reward', eliminationId: 'el-1', choices: [{ type: 'card', instanceId: 'r-spy' }, { type: 'card', instanceId: 'r-tax' }],
    }]]);
  });
});
