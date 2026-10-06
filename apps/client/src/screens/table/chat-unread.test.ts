import { describe, expect, it } from 'vitest';

import { chatUnreadCount } from './chat-unread';

describe('chat unread badge (rules spec §6 Chat)', () => {
  it('counts messages that arrived while the popup was closed', () => {
    expect(chatUnreadCount({ messageCount: 4, seenCount: 1, open: false })).toBe(3);
    expect(chatUnreadCount({ messageCount: 4, seenCount: 1, open: true })).toBe(0);
    expect(chatUnreadCount({ messageCount: 1, seenCount: 4, open: false })).toBe(0);
  });
});
