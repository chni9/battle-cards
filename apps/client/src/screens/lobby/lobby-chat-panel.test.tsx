// @vitest-environment happy-dom
/**
 * Lobby chat panel: technical spec v7 §7.5 and §10.6 (L76-13). It sits under the seats, collapses,
 * sends on Enter, caps at 200 characters and carries the walk-in label (Q21). Parity rows:
 * `lobby-chat`, `lobby-chat-walk-in-spectator-stream`, `chat-compose-enter`,
 * `chat-new-message-announcement`. Collapsing or expanding sends nothing.
 */
import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_LOG_LABEL, CHAT_SEND_LABEL } from '../../ui/chat/chat-line';
import { v7SeatColor } from '../../ui/palette';
import { lobbyPlayersHeading, WALK_IN_CHAT_LABEL } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}
const toggle = () => screen.getByRole('button', { name: CHAT_LOG_LABEL });
const field = (name: string = CHAT_INPUT_LABEL) => screen.getByRole<HTMLInputElement>('textbox', { name });
const line = (order: number, senderId: string, nickname: string, role: ChatMessageView['role'], body: string): ChatMessageView =>
  ({ order, senderId, nickname, role, body, round: 0 });

describe('LobbyChatPanel (spec v7 §7.5)', () => {
  it('sits under the seats with a Chat heading, open from the start', () => {
    renderLobby();
    const seats = screen.getByRole('heading', { name: lobbyPlayersHeading(3) });
    const chat = screen.getByRole('heading', { name: CHAT_LOG_LABEL });
    expect(seats.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('log')).toBeTruthy();
  });
  it('sends the trimmed body on Enter and resets the input', async () => {
    const { user, props } = renderLobby();
    await user.type(field(), '  hello lobby  {Enter}');
    expect(props.onSendChat).toHaveBeenCalledTimes(1);
    expect(props.onSendChat).toHaveBeenCalledWith('hello lobby');
    expect(field().value).toBe('');
  });
  it('sends nothing for whitespace, from Enter or Send', async () => {
    const { user, props } = renderLobby();
    await user.type(field(), '   {Enter}');
    await user.click(screen.getByRole('button', { name: CHAT_SEND_LABEL }));
    expect(props.onSendChat).not.toHaveBeenCalled();
  });
  it('caps the input at 200 characters', async () => {
    const { user, props } = renderLobby();
    expect(field().getAttribute('maxlength')).toBe(String(CHAT_BODY_MAX_LENGTH));
    await user.click(field());
    await user.paste('a'.repeat(CHAT_BODY_MAX_LENGTH + 5));
    await user.keyboard('{Enter}');
    expect(props.onSendChat).toHaveBeenCalledWith('a'.repeat(CHAT_BODY_MAX_LENGTH));
  });
  it('labels the input Spectators only see this for a walk-in, and Message for a seated player', () => {
    const walkIn = renderLobby({ view: walkInLobbyView() });
    expect(field(WALK_IN_CHAT_LABEL).getAttribute('placeholder')).toBe(WALK_IN_CHAT_LABEL);
    walkIn.unmount();
    for (const view of [hostLobbyView(), guestLobbyView()]) {
      const seated = renderLobby({ view });
      expect(field().getAttribute('placeholder')).toBe(CHAT_INPUT_LABEL);
      expect(screen.queryByRole('textbox', { name: WALK_IN_CHAT_LABEL })).toBeNull();
      seated.unmount();
    }
  });
  it('reads No messages yet. when empty, then stamps each line with its round and seat-colored nickname', () => {
    const empty = renderLobby();
    expect(within(screen.getByRole('log')).getByText(CHAT_EMPTY_COPY)).toBeTruthy();
    empty.unmount();
    renderLobby({ view: walkInLobbyView({ chatMessages: [line(1, 'guest', 'Bea', 'living', 'gl hf'), line(2, 'watcher', 'Cy', 'spectator', 'hi')] }) });
    const log = screen.getByRole('log');
    expect(within(log).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Lobby Bea: gl hf', 'Lobby Cy (spectator): hi']);
    expect(within(log).getByText('Bea').style.color).toBe(cssColor(v7SeatColor(1)));
  });
  it('collapses with the hidden attribute, keeps the transcript and the draft, and sends nothing', async () => {
    const { user, props } = renderLobby({ view: hostLobbyView({ chatMessages: [line(1, 'guest', 'Bea', 'living', 'gl hf')] }) });
    const log = screen.getByRole('log');
    await user.type(field(), 'half a thought');
    await user.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    const body = document.getElementById(toggle().getAttribute('aria-controls') ?? '');
    expect(body?.hidden).toBe(true);
    expect(body?.contains(log)).toBe(true);
    expect(screen.queryByRole('log')).toBeNull();
    await user.click(toggle());
    expect(screen.getByRole('log')).toBe(log);
    expect(field().value).toBe('half a thought');
    expectNoLobbyIntent(props);
  });
});
