// @vitest-environment happy-dom
/** Lobby header and game code: technical spec v7 §7.2; parity lobby-header-status, lobby-game-code (L76-12). */
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { STATUS_LABELS } from '../status-labels';
import {
  COPY_FAILED_TITLE, COPY_LABEL, COPY_OK_TITLE, COPY_RESULT_DISMISS_LABEL, copyResultBody, HOST_LINE, LOBBY_EYEBROW, LOBBY_TITLE,
} from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, makeLobbyProps } from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
afterEach(() => {
  vi.restoreAllMocks();
});

describe('LobbyHeader (spec v7 §7.2; parity lobby-header-status, lobby-game-code)', () => {
  it('puts the lobby on the V7 ground with the eyebrow, title, status line and inline alert', () => {
    const { props, rerender } = renderLobby({ error: 'That seat was not found.' });
    expect(screen.getByRole('main').classList.contains('v7-ground')).toBe(true);
    expect(screen.getByText(LOBBY_EYEBROW)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: LOBBY_TITLE })).toBeTruthy();
    expect(screen.getByText(STATUS_LABELS.connected)).toBeTruthy();
    expect(within(screen.getByRole('main')).getByRole('alert').textContent).toContain('That seat was not found.');
    rerender(<LobbyScreen {...props} status="reconnecting" error={null} />);
    expect(screen.getByText(STATUS_LABELS.reconnecting)).toBeTruthy();
    expect(within(screen.getByRole('main')).queryByRole('alert')).toBeNull();
  });
  it('tells the host they are the host, and nobody else', () => {
    const { unmount } = renderLobby();
    expect(screen.getByText(HOST_LINE)).toBeTruthy();
    unmount();
    renderLobby({ view: guestLobbyView() });
    expect(screen.queryByText(HOST_LINE)).toBeNull();
  });
  it('copies the code and says Code copied, sending nothing', async () => {
    const { user, props } = renderLobby();
    // `renderUi`'s user-event setup installed a clipboard stub on navigator.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: COPY_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: COPY_OK_TITLE });
    expect(writeText).toHaveBeenCalledWith('ABCDEF');
    expect(dialog.getAttribute('data-lobby-sheet')).toBe('copy-result');
    expect(within(dialog).getByText(copyResultBody('ABCDEF', false))).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: COPY_RESULT_DISMISS_LABEL }));
    // An exiting V7 sheet is already aria-hidden: wait for its removal with `hidden: true`.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: COPY_OK_TITLE, hidden: true })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });
  it('shows the code in the dialog when the copy fails', async () => {
    const { user, props } = renderLobby();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: COPY_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: COPY_FAILED_TITLE });
    expect(within(dialog).getByText('Could not copy automatically. Game code: ABCDEF')).toBeTruthy();
    expectNoLobbyIntent(props);
  });
});
