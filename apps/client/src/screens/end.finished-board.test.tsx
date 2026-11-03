// @vitest-environment happy-dom
/**
 * The finished board on the arena: technical spec v7 §4.4, §6.12, §13 (Q48, Q63); Appendix A
 * `finished-board-readonly`, `end-finished-board-shell`, `end-finished-chat-readonly`,
 * `end-chat-frozen-snapshot`, `table-leave-forfeit`; L47-03, L51-06, L57-03; Part 2 Review
 * Focus 5 (L74-24).
 */
import type { ChatMessageView, FinishedStateView, PlayingStateView } from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { markFeedbackAsked } from '../feedback/asked-storage';
import { renderUi, type RenderUiOptions } from '../test/render';
import { DUR_BASE_MS } from '../ui/motion/motion-tokens';
import { TABLE_BANNER_MS } from '../view-model/table-banner';
import { makeCard, makeFinishedView, makeSelf, type FinishedViewOverrides } from '../view-model/test-fixtures';
import { ArenaScreen } from './arena/arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './arena/test-view';
import { EndScreen, type EndScreenProps } from './end';
import { STATUS_LABELS } from './status-labels';

const OPTIONS: RenderUiOptions = { reducedMotion: true, advanceTimers: vi.advanceTimersByTime };
function endProps(view: FinishedStateView, onLeave: () => void = vi.fn()): EndScreenProps {
  return { view, actionReject: null, onDismissActionReject: vi.fn(), statusLabel: STATUS_LABELS.connected, nowMs: 0, onLeave, tableUi: 'next' };
}
function renderEnd(finalTable: PlayingStateView, finished: FinishedViewOverrides = {}) {
  const onLeave = vi.fn<() => void>();
  return { ...renderUi(<EndScreen {...endProps(makeFinishedView({ finalTable, ...finished }), onLeave)} />, OPTIONS), onLeave };
}
function region(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (found === null) throw new Error(`no ${name} region`);
  return found;
}
/** A native `disabled` or the `aria-disabled` a `focusableWhenDisabled` Button renders. */
const isDisabled = (button: HTMLElement): boolean =>
  button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
const gameOver = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'Game over' });
async function closeGameOver(user: ReturnType<typeof renderUi>['user']): Promise<void> {
  const dialog = gameOver();
  if (dialog === null) throw new Error('Game over is not open');
  elapse(DUR_BASE_MS); // the entrance shield ignores presses for DUR_BASE_MS after Game over opens
  await user.click(within(dialog).getByRole('button', { name: 'View board' }));
  await waitFor(() => {
    expect(gameOver()).toBeNull();
  });
}
const elapse = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('finished board on the arena (spec v7 §6.12, L74-24)', () => {
  it('mounts the arena on the final table: every intent locked, the clock at —, Shop and Stats in the dock', () => {
    renderEnd(makeArenaView());
    expect(document.querySelector('[data-arena="next"]')?.getAttribute('data-action-lock')).toBe('actions-locked');
    expect(region('top-bar').querySelector('[data-zone="timer-label"]')?.textContent).toBe('—');
    const dock = region('dock');
    expect(within(dock).getByRole('button', { name: 'Shop' })).toBeTruthy();
    expect(within(dock).getByRole('button', { name: 'Stats' })).toBeTruthy();
    expect(within(dock).queryByRole('button', { name: /^Draw/ })).toBeNull();
  });

  it('reopens Game over from Stats, and Stats does nothing while Feedback is open (L47-03)', async () => {
    markFeedbackAsked('TEST');
    const { user } = renderEnd(makeArenaView());
    elapse(TABLE_BANNER_MS);
    await closeGameOver(user);
    await user.click(within(region('dock')).getByRole('button', { name: 'Stats' }));
    expect(gameOver()).not.toBeNull();
    await closeGameOver(user);
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Feedback' }));
    expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeTruthy();
    await user.click(within(region('dock')).getByRole('button', { name: 'Stats' }));
    expect(gameOver()).toBeNull();
    // While Feedback is open Game over is closed whatever Stats does, so only closing Feedback shows
    // whether the click was ignored (`canReopenEndStats`): an honoured click would pop Game over open now.
    await user.click(within(screen.getByRole('dialog', { name: 'Feedback' })).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    });
    expect(gameOver()).toBeNull();
  });

  it('keeps Game over open when the second tap of a double tap on Stats lands on View board (L74-26 gate G8)', async () => {
    markFeedbackAsked('TEST');
    const { user } = renderEnd(makeArenaView());
    elapse(TABLE_BANNER_MS);
    await closeGameOver(user);
    await user.click(within(region('dock')).getByRole('button', { name: 'Stats' }));
    const viewBoard = (): HTMLElement => within(gameOver() ?? document.body).getByRole('button', { name: 'View board' });
    await user.click(viewBoard());
    // Long enough for an unshielded close to finish its exit animation and unmount the dialog.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(gameOver()).not.toBeNull();
    await closeGameOver(user);
  });

  it.each([
    { label: 'the ask-once Feedback first', asked: false },
    { label: 'leaving at once once asked', asked: true },
  ])('confirms Return home on the flag through requestLeave: $label (L57-03)', async ({ asked }) => {
    if (asked) markFeedbackAsked('TEST');
    const { user, onLeave } = renderEnd(makeArenaView());
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Return home' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Return home?' })).getByRole('button', { name: 'Return home' }));
    expect(onLeave).toHaveBeenCalledTimes(asked ? 1 : 0);
    expect(screen.queryByRole('dialog', { name: 'Feedback' }) === null).toBe(asked);
  });

  it('opens the manual Feedback from ! only while Game over is closed (L47-03)', async () => {
    markFeedbackAsked('TEST');
    const { user } = renderEnd(makeArenaView());
    elapse(TABLE_BANNER_MS);
    const bang = (): HTMLElement => within(region('top-bar')).getByRole('button', { name: 'Feedback' });
    await user.click(bang());
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    await closeGameOver(user);
    await user.click(bang());
    expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeTruthy();
  });

  it('shows You won! on first paint for a POV win, before Game over opens (L51-06)', () => {
    renderEnd(makeArenaView(), { winnerPlayerId: 'me' });
    expect(document.querySelector('[data-banner="won"]')?.textContent).toBe('You won!');
    expect(gameOver()).toBeNull();
    elapse(TABLE_BANNER_MS);
    expect(gameOver()).not.toBeNull();
  });

  it('shows the POV elimination overlay, never the You are dead banner, before Game over opens', () => {
    renderEnd(makeArenaView({ pov: 'eliminated', overrides: { currentTurnPlayerId: null } }), { winnerPlayerId: 'p1' });
    const overlay = document.querySelector('[data-pov-elimination]');
    expect(overlay?.textContent).toBe('You are dead');
    expect(document.querySelector('[data-banner="dead"]')).toBeNull();
    elapse(TABLE_BANNER_MS);
    expect(overlay?.textContent).toBe('');
    expect(gameOver()).not.toBeNull();
  });

  it('sends nothing: no Draw, locked card actions, a browse-only Shop and a chat with no composer (Review Focus 5)', async () => {
    const self = makeSelf({ points: 40, upgradePoints: 3, hand: [makeCard('spy', { instanceId: 'spy-1' })] });
    const props = makeArenaProps({ view: makeArenaView({ overrides: { gameCode: 'RDONLY', self } }), readOnly: true, onShowStats: vi.fn(), onOpenFeedback: vi.fn() });
    const { user } = renderUi(<ArenaScreen {...props} />, OPTIONS);
    expect(within(region('dock')).queryByRole('button', { name: /^Draw/ })).toBeNull();
    await user.click(within(region('hand')).getByRole('button', { name: 'Spy' }));
    // Non-empty and disabled first, so a regression that drops the actions fails here, not silently.
    const cardActions = within(screen.getByRole('dialog', { name: 'Spy' })).queryAllByRole('button', { name: /^(Use|Upgrade|Sell)/ });
    expect(cardActions.length).toBeGreaterThan(0);
    expect(cardActions.every(isDisabled)).toBe(true);
    for (const button of cardActions) {
      await user.click(button);
    }
    await user.keyboard('{Escape}');
    await user.click(within(region('dock')).getByRole('button', { name: 'Shop' }));
    const buys = within(await screen.findByRole('dialog', { name: 'Shop' })).queryAllByRole('button', { name: /^Buy/ });
    expect(buys.length).toBeGreaterThan(0);
    expect(buys.every(isDisabled)).toBe(true);
    for (const button of buys) {
      await user.click(button);
    }
    await user.keyboard('{Escape}');
    await user.click(within(region('top-bar')).getByRole('button', { name: /^Chat/ }));
    expect(within(await screen.findByRole('dialog', { name: 'Chat' })).queryByRole('textbox')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('gives a walk-in on the finished board a Stats-only dock (Q38)', async () => {
    const onShowStats = vi.fn<() => void>();
    const props = makeArenaProps({ view: makeArenaView({ pov: 'walk-in' }), readOnly: true, onShowStats, onOpenFeedback: vi.fn() });
    const { user } = renderUi(<ArenaScreen {...props} />, OPTIONS);
    expect(within(region('dock')).getAllByRole('button')).toHaveLength(1);
    await user.click(within(region('dock')).getByRole('button', { name: 'Stats' }));
    expect(onShowStats).toHaveBeenCalledTimes(1);
    expectNoArenaIntent(props);
  });
});

describe('the live → finished switch (Review Focus 5)', () => {
  it('keeps the chat unread count across the switch (Q48)', () => {
    const line: ChatMessageView = { order: 1, senderId: 'p1', nickname: 'p1', role: 'living', body: 'gg', round: 2 };
    const live = makeArenaView({ overrides: { gameCode: 'UNRD01', chatMessages: [] } });
    const props = makeArenaProps({ view: live });
    const { rerender } = renderUi(<ArenaScreen {...props} />, OPTIONS);
    const withLine = { ...live, chatMessages: [line] };
    rerender(<ArenaScreen {...props} view={withLine} />);
    expect(within(region('top-bar')).getByRole('button', { name: 'Chat, 1 unread' })).toBeTruthy();
    rerender(<EndScreen {...endProps(makeFinishedView({ finalTable: withLine, winnerPlayerId: 'p1' }))} />);
    expect(within(region('top-bar')).getByRole('button', { name: 'Chat, 1 unread' })).toBeTruthy();
  });

  it('replays no past elimination beat when the finished board mounts (Q63)', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(10, 10, 76, 92));
    const before = makeArenaView({ overrides: { gameCode: 'BEAT01' } });
    const after = makeArenaView({
      tiers: { p1: 'eliminated' },
      overrides: { gameCode: 'BEAT01', actionLog: [{ kind: 'playerEliminated', playerId: 'p1', eliminatorPlayerId: 'me', reason: 'combat', turnSequence: 1 }] },
    });
    const props = makeArenaProps({ view: before });
    const { rerender } = renderUi(<ArenaScreen {...props} />, OPTIONS);
    rerender(<ArenaScreen {...props} view={after} />);
    elapse(0);
    // Positive control: a live elimination plays its beat once (L74-17).
    expect(document.querySelectorAll('[data-fx="elimination-beat"]')).toHaveLength(1);
    rerender(<EndScreen {...endProps(makeFinishedView({ finalTable: after, winnerPlayerId: 'me' }))} />);
    elapse(0);
    expect(document.querySelectorAll('[data-fx="elimination-beat"]')).toHaveLength(0);
  });
});
