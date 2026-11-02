// @vitest-environment happy-dom
/**
 * Chat seen store: technical spec v7 §6.9, §13 Q48; Lot 74 plan A.9.1 (L74-16). The store lives for
 * the page, so each test uses its own room codes. The hook tests need a DOM (`renderHook`), as the
 * other behavior tests on a hook in a `.test.ts` do (`net/use-room-connection.*.behavior.test.ts`).
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '../../test/render'; // act environment and per-test cleanup (L72-06)
import {
  chatSeenCount,
  forgetChatSeen,
  markChatSeen,
  subscribeChatSeen,
  useChatUnread,
  type ChatUnreadInput,
} from './chat-unread-store';

/** Renders the hook and records every value it returned, so a one-render flash would show. */
function renderUnread(initial: ChatUnreadInput): {
  readonly rendered: readonly number[];
  readonly current: () => number;
  readonly update: (input: ChatUnreadInput) => void;
} {
  const rendered: number[] = [];
  const { result, rerender } = renderHook(
    (input: ChatUnreadInput) => {
      const unread = useChatUnread(input);
      rendered.push(unread);
      return unread;
    },
    { initialProps: initial },
  );
  return { rendered, current: () => result.current, update: rerender };
}

describe('chat seen store (Q48)', () => {
  it('keeps one seen count per room and notifies subscribers only on a change', () => {
    const listener = vi.fn<() => void>();
    const stop = subscribeChatSeen(listener);
    expect(chatSeenCount('ROOM-A')).toBeUndefined();
    markChatSeen('ROOM-A', 3);
    markChatSeen('ROOM-A', 3);
    markChatSeen('ROOM-B', 1);
    expect([chatSeenCount('ROOM-A'), chatSeenCount('ROOM-B')]).toEqual([3, 1]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    markChatSeen('ROOM-A', 4);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('forgets one room and notifies subscribers only when it had an entry', () => {
    markChatSeen('FORGET-A', 2);
    markChatSeen('FORGET-B', 5);
    const listener = vi.fn<() => void>();
    const stop = subscribeChatSeen(listener);
    forgetChatSeen('FORGET-A');
    forgetChatSeen('FORGET-A');
    forgetChatSeen('FORGET-NEVER-SEEN');
    expect([chatSeenCount('FORGET-A'), chatSeenCount('FORGET-B')]).toEqual([undefined, 5]);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('useChatUnread (§6.9, Q48)', () => {
  it('starts a rematch of the same room with the lobby lines seen once the room is forgotten', () => {
    const room = 'REMATCH';
    const { rendered, current, update } = renderUnread({ gameCode: room, messageCount: 3, open: true });
    update({ gameCode: room, messageCount: 3, open: false });
    expect(current()).toBe(0);
    // Lines arrive in the lobby between matches, while no arena counts them.
    update({ gameCode: room, messageCount: 5, open: false });
    expect(current()).toBe(2);
    const before = rendered.length;
    act(() => {
      forgetChatSeen(room);
    });
    expect([current(), chatSeenCount(room), rendered.slice(before).every((unread) => unread === 0)]).toEqual([0, 5, true]);
    update({ gameCode: room, messageCount: 6, open: false });
    expect(current()).toBe(1);
  });

  it('re-seeds when the transcript shrinks (a walk-in claimed a seat), so the next lines count', () => {
    const room = 'SHRINK';
    const { current, update } = renderUnread({ gameCode: room, messageCount: 4, open: false });
    update({ gameCode: room, messageCount: 2, open: false });
    expect([current(), chatSeenCount(room)]).toEqual([0, 2]);
    update({ gameCode: room, messageCount: 3, open: false });
    expect(current()).toBe(1);
  });
});
