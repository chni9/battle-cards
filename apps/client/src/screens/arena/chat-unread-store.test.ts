/**
 * Chat seen store: technical spec v7 §6.9, §13 Q48; Lot 74 plan A.9.1 (L74-16). The store lives for
 * the page, so each test uses its own room codes.
 */
import { describe, expect, it, vi } from 'vitest';

import { chatSeenCount, markChatSeen, subscribeChatSeen } from './chat-unread-store';

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
});
