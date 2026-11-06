// @vitest-environment happy-dom
/** Lobby header and game code: technical spec v7 §7.2; parity lobby-header-status, lobby-game-code (L76-12). */
import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { STATUS_LABELS } from '../status-labels';
import { inviteLink } from './invite-link';
import {
  COPY_FAILED_TITLE, COPY_LABEL, COPY_OK_TITLE, COPY_RESULT_DISMISS_LABEL, copyResultBody, HOST_LINE, LINK_COPIED_TITLE, linkCopiedBody,
  LOBBY_DISMISS_LABEL, LOBBY_EYEBROW, LOBBY_TITLE, SHARE_LABEL,
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

describe('Alert dismiss focus and Copy/Share grouping (L76-14, L76-17; browser gate D3, D4)', () => {
  it('moves focus to the lobby title when OK dismisses the alert, so it does not fall to the page', async () => {
    const { user, props } = renderLobby({ error: 'That seat was not found.' });
    await user.click(screen.getByRole('button', { name: LOBBY_DISMISS_LABEL }));
    expect(props.onDismissError).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: LOBBY_TITLE }));
  });
  it('keeps Copy and Share in one group, so the pair wraps together under the code', () => {
    renderLobby();
    const copy = screen.getByRole('button', { name: COPY_LABEL });
    const share = screen.getByRole('button', { name: SHARE_LABEL });
    expect(copy.parentElement).toBe(share.parentElement);
    expect(copy.parentElement?.children).toHaveLength(2);
  });
});

describe('Share (spec v7 §7.2, Q28; L76-17)', () => {
  const link = (): string => inviteLink(window.location.origin, 'ABCDEF');
  function stubShare(share: (data: ShareData) => Promise<void>): void {
    Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
  }
  async function settle(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
    });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
  });

  it('hands the invite link to the Web Share sheet and shows no dialog', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() => Promise.resolve());
    stubShare(share);
    const { user, props } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    await settle();
    expect(share.mock.calls).toEqual([[{ url: link() }]]);
    expect(link()).toBe(`${window.location.origin}/?code=ABCDEF`);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    expectNoLobbyIntent(props);
  });

  it('stays silent when the player cancels the share sheet', async () => {
    stubShare(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const { user } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    await settle();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
  });

  it('copies the link and says Link copied where Web Share is missing, even while reconnecting', async () => {
    const { user, props } = renderLobby({ status: 'reconnecting' });
    expect('share' in navigator).toBe(false);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: LINK_COPIED_TITLE });
    expect(writeText).toHaveBeenCalledWith(link());
    expect(dialog.getAttribute('data-lobby-sheet')).toBe('copy-result');
    expect(within(dialog).getByText(linkCopiedBody(link()))).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: COPY_RESULT_DISMISS_LABEL }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: LINK_COPIED_TITLE, hidden: true })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it.each([
    { label: 'a share fails (not a cancel) and the link copies', share: 'fails', clipboard: 'ok', title: LINK_COPIED_TITLE },
    { label: 'Web Share is missing and the clipboard refuses', share: 'missing', clipboard: 'fails', title: COPY_FAILED_TITLE },
    { label: 'a share fails and the clipboard refuses', share: 'fails', clipboard: 'fails', title: COPY_FAILED_TITLE },
  ] as const)('still shows the code when $label', async ({ share, clipboard, title }) => {
    if (share === 'fails') stubShare(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const { user, props } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    if (clipboard === 'ok') writeText.mockResolvedValue(undefined);
    else writeText.mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: title });
    expect(writeText).toHaveBeenCalledWith(link());
    expect(dialog.textContent).toContain('ABCDEF');
    expect(within(dialog).getByText(title === LINK_COPIED_TITLE ? linkCopiedBody(link()) : copyResultBody('ABCDEF', true))).toBeTruthy();
    expectNoLobbyIntent(props);
  });
});
