// @vitest-environment happy-dom
/**
 * Server rejects in the arena: technical spec v7 §6.6.2, §6.12, §8.3; Appendix A `illegal-action-dialog`,
 * `reject-state-carryover`, `table-subchoice-gate-reject-copy`; Part 2 Review Focus 4 (L74-25).
 */
import type { PlayingStateView } from '@card-battle/shared';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ActionRejectPayload } from '../../net/use-room-connection';
import { renderUi, type RenderUiOptions, type RenderUiResult } from '../../test/render';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { REJECT_TOAST_MS } from './reject-model';
import { makeArenaProps, makeArenaView } from './test-view';

const NOT_YOUR_TURN: ActionRejectPayload = { code: 'not-your-turn', message: 'Not your turn.' };
const ALREADY_ACTED: ActionRejectPayload = { code: 'already-acted', message: 'Already acted.' };
const CHAT_TOO_LONG: ActionRejectPayload = { code: 'send-chat-too-long', message: 'A chat message is at most 200 characters.' };
const handView = (): PlayingStateView => makeArenaView({ overrides: { self: makeSelf({ points: 30, hand: [makeCard('spy'), makeCard('tax')] }) } });
function setup(view: PlayingStateView, overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const props = makeArenaProps({ view, ...overrides });
  return { props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const draw = (): HTMLElement => within(region('dock')).getByRole('button', { name: /^Draw, plus / });
const toastShows = (title: string): boolean => within(screen.getByRole('alert')).queryByText(title) !== null;
/** The in-place wrapper that counts a hand card's spring-backs (`data-reject-shakes`, like `data-upgrade-flip`). */
function shakeWrapper(name: string): HTMLElement {
  const wrapper = handCard(name).closest<HTMLElement>('[data-reject-shakes]');
  if (wrapper === null) throw new Error(`no shake count on ${name}`);
  return wrapper;
}
const shakes = (name: string): string | null => shakeWrapper(name).getAttribute('data-reject-shakes');
/** Plays Spy on p2 through tap-tap targeting: the send the next reject answers. */
async function playSpy(user: RenderUiResult['user'], props: ArenaScreenProps): Promise<void> {
  await user.click(handCard('Spy'));
  await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: /^Use/ }));
  await user.click(within(region('arena')).getByRole('button', { name: 'p2, target' }));
  expect(vi.mocked(props.onPlayCard).mock.calls).toEqual([['spy-1', { targetPlayerId: 'p2' }]]);
}

describe('reject toast (§6.12)', () => {
  it('shows the ILLEGAL_ACTION_COPY title and body in an error toast, not a modal', () => {
    setup(makeArenaView(), { actionReject: NOT_YOUR_TURN });
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Not your turn')).not.toBeNull();
    expect(within(alert).getByText(ILLEGAL_ACTION_COPY['not-your-turn'].body)).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the toast across a state update and dismisses it once by OK (Review Focus 4)', async () => {
    const { user, props, rerender } = setup(makeArenaView(), { actionReject: NOT_YOUR_TURN });
    rerender(<ArenaScreen {...props} view={{ ...props.view, turnSequence: props.view.turnSequence + 1 }} />);
    expect(toastShows('Not your turn')).toBe(true);
    expect(props.onDismissActionReject).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(props.onDismissActionReject).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself once after REJECT_TOAST_MS, also over an open card sheet whose focus trap keeps Tab off OK (watch point)', async () => {
    vi.useFakeTimers();
    const { user, props, rerender } = setup(handView(), {}, { advanceTimers: vi.advanceTimersByTime });
    await user.click(handCard('Tax'));
    rerender(<ArenaScreen {...props} actionReject={ALREADY_ACTED} />);
    act(() => { vi.advanceTimersByTime(REJECT_TOAST_MS - 1); });
    expect(props.onDismissActionReject).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1 + REJECT_TOAST_MS); });
    expect(props.onDismissActionReject).toHaveBeenCalledTimes(1);
  });

  it.each([{ reducedMotion: false, motion: 'full' }, { reducedMotion: true, motion: 'reduced' }])(
    'a rejected Spy play springs its hand card back once, a shake or a flash: $motion motion (§6.6.2, §8.3)',
    async ({ reducedMotion, motion }) => {
      const { user, props, rerender } = setup(handView(), {}, { reducedMotion });
      await playSpy(user, props);
      expect([shakes('Spy'), shakes('Tax')]).toEqual(['0', '0']);
      rerender(<ArenaScreen {...props} actionReject={NOT_YOUR_TURN} />);
      expect([shakes('Spy'), shakes('Tax')]).toEqual(['1', '0']);
      expect(shakeWrapper('Spy').getAttribute('data-motion')).toBe(motion);
    },
  );

  it('an unrelated later reject (a chat send) with no state update never shakes the rejected card again (L74-25 M2)', async () => {
    const { user, props, rerender } = setup(handView());
    await playSpy(user, props);
    rerender(<ArenaScreen {...props} actionReject={NOT_YOUR_TURN} />);
    expect(shakes('Spy')).toBe('1');
    rerender(<ArenaScreen {...props} actionReject={CHAT_TOO_LONG} />);
    expect(toastShows(ILLEGAL_ACTION_COPY['send-chat-too-long'].body)).toBe(true);
    expect([shakes('Spy'), shakes('Tax')]).toEqual(['1', '0']);
  });

  it('a Draw reject with no state update re-arms the Draw latch and shakes no card (Review Focus 4)', async () => {
    const { user, props, rerender } = setup(handView());
    await user.click(draw());
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(1);
    rerender(<ArenaScreen {...props} actionReject={ALREADY_ACTED} />);
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(2);
    expect([shakes('Spy'), shakes('Tax')]).toEqual(['0', '0']);
  });
});
