// @vitest-environment happy-dom
/**
 * Server rejects in the arena: technical spec v7 §6.6.2, §6.12, §8.3; Appendix A `illegal-action-dialog`,
 * `reject-state-carryover`, `table-subchoice-gate-reject-copy`; Part 2 Review Focus 4 (L74-25).
 */
import type { PlayingStateView } from '@card-battle/shared';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ActionRejectPayload } from '../../net/use-room-connection';
import { renderUi, type RenderUiOptions } from '../../test/render';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { REJECT_TOAST_MS } from './reject-model';
import { makeArenaProps, makeArenaView } from './test-view';

const NOT_YOUR_TURN: ActionRejectPayload = { code: 'not-your-turn', message: 'Not your turn.' };
const ALREADY_ACTED: ActionRejectPayload = { code: 'already-acted', message: 'Already acted.' };
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

  it.each([{ reducedMotion: false, cue: 'shake' }, { reducedMotion: true, cue: 'flash' }])(
    'a rejected Spy play marks its hand card: $cue (reduced motion $reducedMotion; §6.6.2, §8.3)',
    async ({ reducedMotion, cue }) => {
      const { user, props, rerender } = setup(handView(), {}, { reducedMotion });
      await user.click(handCard('Spy'));
      await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: /^Use/ }));
      await user.click(within(region('arena')).getByRole('button', { name: 'p2, target' }));
      expect(vi.mocked(props.onPlayCard).mock.calls).toEqual([['spy-1', { targetPlayerId: 'p2' }]]);
      expect(handCard('Spy').closest('[data-reject-cue]')).toBeNull();
      rerender(<ArenaScreen {...props} actionReject={NOT_YOUR_TURN} />);
      expect(handCard('Spy').closest('[data-reject-cue]')?.getAttribute('data-reject-cue')).toBe(cue);
      expect(handCard('Tax').closest('[data-reject-cue]')).toBeNull();
    },
  );

  it('a Draw reject with no state update re-arms the Draw latch and shakes no card (Review Focus 4)', async () => {
    const { user, props, rerender } = setup(handView());
    await user.click(draw());
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(1);
    rerender(<ArenaScreen {...props} actionReject={ALREADY_ACTED} />);
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-reject-cue]')).toBeNull();
  });
});
