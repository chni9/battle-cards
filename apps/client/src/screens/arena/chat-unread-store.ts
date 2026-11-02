/**
 * The chat's seen count, kept outside the arena — technical spec v7 §6.9 ("the unread count survives
 * remounts within the session"), §13 Q48; Lot 74 plan Appendix A.9.1 (L74-16).
 *
 * V2 kept the seen count in the table's own state, so every remount (a reconnect, the live → finished
 * switch) started again from "everything seen". Here it is module state keyed by room code, read
 * through `useSyncExternalStore`, so a new arena for the same room keeps the count. It is memory
 * only: a page reload starts again, and App needs no prop for it.
 */

import { useEffect, useSyncExternalStore } from 'react';

import { chatUnreadCount } from '../../view-model/chat-unread';

const seenByRoom = new Map<string, number>();
const listeners = new Set<() => void>();

/** The lines the reader has seen in this room, or `undefined` before the arena first rendered it. */
export function chatSeenCount(gameCode: string): number | undefined {
  return seenByRoom.get(gameCode);
}

/** Records `count` lines as seen for the room; notifies subscribers only on a change. */
export function markChatSeen(gameCode: string, count: number): void {
  if (seenByRoom.get(gameCode) === count) {
    return;
  }
  seenByRoom.set(gameCode, count);
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeChatSeen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface ChatUnreadInput {
  readonly gameCode: string;
  readonly messageCount: number;
  readonly open: boolean;
}

/** The unread count (V2 `chatUnreadCount`) over the store's seen count for this room. */
export function useChatUnread({ gameCode, messageCount, open }: ChatUnreadInput): number {
  const stored = useSyncExternalStore(subscribeChatSeen, () => chatSeenCount(gameCode));
  // First sight of a room: the lines already there are seen (V2 seeded at mount). While the sheet
  // is open the seen count follows the transcript, so every way it closes marks everything seen.
  useEffect(() => {
    if (open || stored === undefined) {
      markChatSeen(gameCode, messageCount);
    }
  }, [open, stored, gameCode, messageCount]);
  return chatUnreadCount({ messageCount, seenCount: stored ?? messageCount, open });
}
