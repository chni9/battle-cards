// @vitest-environment happy-dom
/**
 * Chat sheet: technical spec v7 §6.1 item 1, §6.9, §13 Q48; Appendix A `table-chat-popup`,
 * `table-chat`, `table-chat-side-stream-disclosure`, `chat-compose-enter`,
 * `chat-new-message-announcement`, `end-finished-chat-readonly` (L74-16). The unread store lives for
 * the page and is keyed by room code, so each test uses its own `gameCode`.
 */
import { CHAT_BODY_MAX_LENGTH, type ChatMessageView, type PlayingStateView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const line = (order: number, body: string, senderId = 'p1', role: ChatMessageView['role'] = 'living'): ChatMessageView =>
  ({ order, senderId, nickname: senderId, role, body, round: 1 });
function chatView(gameCode: string, count: number): PlayingStateView {
  return makeArenaView({ overrides: { gameCode, chatMessages: Array.from({ length: count }, (_, index) => line(index + 1, `m${String(index + 1)}`)) } });
}
function topBar(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[data-arena-region="top-bar"]');
  if (found === null) throw new Error('no top bar');
  return found;
}
const chatButton = (): HTMLElement => within(topBar()).getByRole('button', { name: /^Chat/ });
const chatSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Chat' });

describe('Chat icon and unread (§6.1 item 1, §6.9, Q48)', () => {
  it('sits first in the right row and counts lines that arrive while the sheet is closed; opening clears it', async () => {
    const props = makeArenaProps({ view: chatView('UNREAD', 1) });
    const { user, rerender } = renderUi(<ArenaScreen {...props} />);
    expect(within(topBar()).getAllByRole('button').slice(0, 2).map((button) => button.getAttribute('aria-label'))).toEqual(['Chat', 'Feedback']);
    rerender(<ArenaScreen {...props} view={chatView('UNREAD', 3)} />);
    expect([chatButton().getAttribute('aria-label'), chatButton().textContent]).toEqual(['Chat, 2 unread', '2']);
    await user.click(chatButton());
    expect(chatSheet().getAttribute('data-arena-sheet')).toBe('chat');
    expect(chatButton().getAttribute('aria-label')).toBe('Chat');
    expectNoArenaIntent(props);
  });

  it('marks every line seen when the sheet closes, so only later lines count', async () => {
    const props = makeArenaProps({ view: chatView('CLOSE', 1) });
    const { user, rerender } = renderUi(<ArenaScreen {...props} />);
    rerender(<ArenaScreen {...props} view={chatView('CLOSE', 2)} />);
    await user.click(chatButton());
    rerender(<ArenaScreen {...props} view={chatView('CLOSE', 3)} />);
    await user.keyboard('{Escape}');
    expect(chatButton().getAttribute('aria-label')).toBe('Chat');
    rerender(<ArenaScreen {...props} view={chatView('CLOSE', 4)} />);
    expect(chatButton().getAttribute('aria-label')).toBe('Chat, 1 unread');
  });

  it('keeps the unread count across a remount of the arena (reconnect)', () => {
    const props = makeArenaProps({ view: chatView('REMOUNT', 1) });
    const first = renderUi(<ArenaScreen {...props} />);
    first.rerender(<ArenaScreen {...props} view={chatView('REMOUNT', 3)} />);
    first.unmount();
    renderUi(<ArenaScreen {...props} view={chatView('REMOUNT', 3)} />);
    expect(chatButton().getAttribute('aria-label')).toBe('Chat, 2 unread');
  });
});

describe('Chat sheet (§6.9)', () => {
  it('Enter sends sendChat once with the trimmed body; whitespace-only sends nothing', async () => {
    const onSendChat = vi.fn<ArenaScreenProps['onSendChat']>();
    const { user } = renderUi(<ArenaScreen {...makeArenaProps({ view: chatView('SEND', 0), onSendChat })} />);
    await user.click(chatButton());
    const input = within(chatSheet()).getByRole<HTMLInputElement>('textbox', { name: 'Message' });
    expect(input.getAttribute('maxlength')).toBe(String(CHAT_BODY_MAX_LENGTH));
    await user.type(input, '   {Enter}');
    expect(onSendChat).not.toHaveBeenCalled();
    await user.type(input, ' gg {Enter}');
    expect([onSendChat.mock.calls, input.value]).toEqual([[['gg']], '']);
  });

  it("shows an eliminated reader's side line with its role label", async () => {
    const view = makeArenaView({ pov: 'eliminated', overrides: { gameCode: 'SIDE', chatMessages: [line(1, 'gl'), line(2, 'gg', 'p2', 'eliminated')] } });
    const { user } = renderUi(<ArenaScreen {...makeArenaProps({ view })} />);
    await user.click(chatButton());
    expect(within(chatSheet()).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Round 1 p1: gl', 'Round 1 p2 (eliminated): gg']);
  });

  it('is read-only on the finished board: the transcript and no composer', async () => {
    const props = makeArenaProps({ view: chatView('DONE', 2), readOnly: true, onOpenFeedback: vi.fn(), onShowStats: vi.fn() });
    const { user } = renderUi(<ArenaScreen {...props} />);
    await user.click(chatButton());
    expect([within(chatSheet()).getAllByRole('listitem').length, within(chatSheet()).queryByRole('textbox')]).toEqual([2, null]);
    expectNoArenaIntent(props);
  });
});
