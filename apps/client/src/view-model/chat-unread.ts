/**
 * Unread chat is local. It counts messages that arrived while the popup was closed.
 */

export function chatUnreadCount(input: {
  messageCount: number;
  seenCount: number;
  open: boolean;
}): number {
  if (input.open) {
    return 0;
  }

  return Math.max(0, input.messageCount - input.seenCount);
}
