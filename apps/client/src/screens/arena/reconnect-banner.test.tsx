// @vitest-environment happy-dom
/**
 * Reconnecting: technical spec v7 §6.12; Appendix A `global-room-connection-lifecycle`,
 * `global-page-reload-recovery`; Part 2 Review Focus 3 (L74-25).
 */
import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { makeCard, makePending, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const handView = (): PlayingStateView => makeArenaView({ overrides: { self: makeSelf({ points: 30, hand: [makeCard('spy'), makeCard('tax')] }) } });
function setup(view: PlayingStateView, overrides: Partial<ArenaScreenProps> = {}) {
  const props = makeArenaProps({ view, ...overrides });
  const result = renderUi(<ArenaScreen {...props} />);
  const status = (connectionStatus: ArenaScreenProps['connectionStatus'], next: Partial<ArenaScreenProps> = {}): void => {
    result.rerender(<ArenaScreen {...props} {...next} connectionStatus={connectionStatus} />);
  };
  return { props, status, ...result };
}
function region(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (element === null) throw new Error(`no ${name} region`);
  return element;
}
const handCard = (name: string): HTMLElement => within(region('hand')).getByRole('button', { name });
const sheet = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const use = (name: string): HTMLElement => within(sheet(name)).getByRole('button', { name: /^Use/ });
const draw = (): HTMLElement => within(region('dock')).getByRole('button', { name: /^Draw, plus / });
const banner = (): Element | null => document.querySelector('[data-zone="reconnect-banner"]');
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';

describe('reconnecting (§6.12, Review Focus 3)', () => {
  it('shows Reconnecting… and locks Draw and an open sheet’s Use, then unlocks both', async () => {
    const { user, props, status } = setup(handView());
    expect([banner()?.getAttribute('role'), banner()?.textContent]).toEqual(['status', '']);
    await user.click(handCard('Tax'));
    expect(isDisabled(use('Tax'))).toBe(false);
    status('reconnecting');
    expect(banner()?.textContent).toBe('Reconnecting…');
    expect(within(sheet('Tax')).getByRole('button', { name: /^Use/, description: DISABLED_REASON_COPY['actions-locked'] })).not.toBeNull();
    expect([isDisabled(use('Tax')), isDisabled(draw())]).toEqual([true, true]);
    expect(document.querySelector('main')?.getAttribute('data-action-lock')).toBe('actions-locked');
    await user.click(use('Tax'));
    await user.click(draw());
    expectNoArenaIntent(props);
    status('connected');
    expect(banner()?.textContent).toBe('');
    expect([isDisabled(use('Tax')), isDisabled(draw())]).toEqual([false, false]);
  });

  it('ends targeting when the connection drops; a seat tap then sends nothing', async () => {
    const { user, props, status } = setup(handView());
    await user.click(handCard('Spy'));
    await user.click(use('Spy'));
    expect(screen.queryByText('Choose a target')).not.toBeNull();
    status('reconnecting');
    expect([screen.queryByText('Choose a target'), document.querySelector('[data-target-seat]')]).toEqual([null, null]);
    await user.click(within(region('arena')).getByRole('button', { name: 'p1' }));
    status('connected');
    expect(document.querySelector('[data-target-seat]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('locks the open sub-choice’s Confirm while reconnecting, then unlocks it', async () => {
    const mirror: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['atk-p1'], deadlineMs: 40_000 };
    const view = makeArenaView({ overrides: { pendingEffects: [makePending({ id: 'atk-p1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' })] } });
    const { user, props, status } = setup(view, { subChoice: mirror });
    const confirm = (): HTMLElement => screen.getByRole('button', { name: 'Confirm redirect' }); // L74-18's Mirror Confirm
    status('reconnecting');
    expect(isDisabled(confirm())).toBe(true);
    await user.click(confirm());
    expectNoArenaIntent(props);
    status('connected');
    await user.click(confirm());
    expect(props.onResolveSubChoice).toHaveBeenCalledTimes(1);
  });

  it('a Draw latched before the drop re-arms on the state push after the reconnect (final review note)', async () => {
    const { user, props, status } = setup(makeArenaView());
    await user.click(draw());
    await user.click(draw());
    status('reconnecting');
    status('connected');
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(1); // same view: the latch holds until the rejoin's state push
    status('connected', { view: { ...props.view } }); // CLIENT_READY → sendStateTo (game-room.ts:490)
    await user.click(draw());
    expect(props.onDraw).toHaveBeenCalledTimes(2);
  });

  it('keeps Forfeit, chat Enter and a walk-in’s Claim a seat available while reconnecting (S3, S11, Review Focus 3)', async () => {
    const { user, props, status, unmount } = setup(handView());
    status('reconnecting');
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Forfeit' }));
    await user.click(within(sheet('Leave the game?')).getByRole('button', { name: 'Forfeit' }));
    expect(props.onForfeit).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Leave the game?' })).toBeNull();
    });
    await user.click(within(region('top-bar')).getByRole('button', { name: /^Chat/ }));
    await user.type(within(sheet('Chat')).getByRole('textbox', { name: 'Message' }), 'gg{Enter}');
    expect(vi.mocked(props.onSendChat).mock.calls).toEqual([['gg']]);
    unmount();
    const onReopenClaim = vi.fn<() => void>();
    const walkIn = setup(makeArenaView({ pov: 'walk-in' }), { onReopenClaim });
    walkIn.status('reconnecting');
    await walkIn.user.click(within(region('self-strip')).getByRole('button', { name: 'Claim a seat' }));
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
  });
});
