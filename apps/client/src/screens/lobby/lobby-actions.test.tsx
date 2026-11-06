// @vitest-environment happy-dom
/** Lobby action bar: technical spec v7 §7.2, §11 (Q39); parity lobby-action-row, global-feedback-entry-points (L76-12). */
import { ACTION_REJECT_MESSAGE } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { LobbyActions } from './lobby-actions';
import { CANCEL_READY_LABEL, FEEDBACK_LABEL, LEAVE_LABEL, READY_BUTTON_LABEL, START_LABEL } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { guestLobbyView, hostLobbyView, isLobbyControlDisabled, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, makeLobbyProps } from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
afterEach(() => {
  vi.restoreAllMocks();
});

const READY_GUEST = { ...LOBBY_GUEST, isReady: true };

describe('LobbyActions (spec v7 §7.2, §11 Q39; parity lobby-action-row)', () => {
  it('puts the check icon on Ready and none on Cancel ready', () => {
    const { unmount } = renderLobby({ view: guestLobbyView() });
    expect(screen.getByRole('button', { name: READY_BUTTON_LABEL }).querySelector('[data-icon="check"]')).not.toBeNull();
    unmount();
    renderLobby({ view: guestLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] }) });
    expect(screen.getByRole('button', { name: CANCEL_READY_LABEL }).querySelector('[data-icon]')).toBeNull();
  });
  it('tells the host why Start is grey, and nothing once the table can start', () => {
    const first = renderLobby();
    expect(screen.getByText(ACTION_REJECT_MESSAGE['start-not-all-ready'])).toBeTruthy();
    first.unmount();
    const alone = renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST] }) });
    expect(screen.getByText(ACTION_REJECT_MESSAGE['start-not-enough-players'])).toBeTruthy();
    alone.unmount();
    renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }) });
    expect(screen.queryByText(ACTION_REJECT_MESSAGE['start-not-all-ready'])).toBeNull();
    expect(screen.queryByText(ACTION_REJECT_MESSAGE['start-not-enough-players'])).toBeNull();
  });
  it('while locked, disables Start and keeps Leave and Feedback live (plan A.4)', async () => {
    const onStart = vi.fn();
    const onLeave = vi.fn();
    const { user } = renderUi(
      <LobbyActions view={hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] })} locked onStart={onStart} onSetReady={vi.fn()} onLeave={onLeave} />,
      { reducedMotion: true },
    );
    const start = screen.getByRole('button', { name: START_LABEL });
    expect(isLobbyControlDisabled(start)).toBe(true);
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: FEEDBACK_LABEL }));
    const feedback = screen.getByRole('dialog', { name: 'Feedback' });
    // Manual mode, as on Home (home-screen.test.tsx): the dismiss reads Cancel, never the ask-mode Skip.
    expect(within(feedback).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(within(feedback).queryByText('Skip is fine.')).toBeNull();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Feedback', hidden: true })).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: LEAVE_LABEL }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
  it('while locked, disables Ready and sends nothing', () => {
    const onSetReady = vi.fn();
    renderUi(<LobbyActions view={guestLobbyView()} locked onStart={vi.fn()} onSetReady={onSetReady} onLeave={vi.fn()} />, { reducedMotion: true });
    const ready = screen.getByRole('button', { name: READY_BUTTON_LABEL });
    expect(isLobbyControlDisabled(ready)).toBe(true);
    fireEvent.click(ready);
    expect(onSetReady).not.toHaveBeenCalled();
  });
});
