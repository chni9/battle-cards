/**
 * The chat's seen count, kept outside the arena — technical spec v7 §6.9 ("the unread count survives
 * remounts within the session"), §13 Q48; Lot 74 plan Appendix A.9.1 (L74-16).
 *
 * V2 kept the seen count in the table's own state, so every remount (a reconnect, the live → finished
 * switch) started again from "everything seen". Here it is module state keyed by room code, read
 * through `useSyncExternalStore`, so a new arena for the same room keeps the count. It is memory
 * only: a page reload starts again, and App needs no prop for it.
 *
 * A rematch stays in the same room and code (Play again) and the transcript continues, so the count
 * a finished match left would show the lobby lines as unread. `forgetChatSeen` drops a room's entry,
 * and the next render treats the room as first seen. `App.tsx` calls it from an effect keyed on the
 * room's lobby phase and code (L74-21), after the lobby has rendered and no arena is mounted, so a
 * new match starts with the lobby lines seen. It is never called from a message handler, where a
 * mounted arena would seed the count again at once.
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

/** Drops the room's seen count, so the next `useChatUnread` render counts the lines already there as seen. Notifies only if there was an entry. */
export function forgetChatSeen(gameCode: string): void {
  if (seenByRoom.delete(gameCode)) {
    for (const listener of listeners) {
      listener();
    }
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
  // First sight of a room, or after `forgetChatSeen`: the lines already there are seen (V2 seeded at
  // mount). While the sheet is open the seen count follows the transcript, so every way it closes
  // marks everything seen. A transcript shorter than the seen count (a walk-in claimed a living seat
  // and lost the side lines) re-seeds at the shorter count, so the next lines still count.
  useEffect(() => {
    if (open || stored === undefined || messageCount < stored) {
      markChatSeen(gameCode, messageCount);
    }
  }, [open, stored, gameCode, messageCount]);
  return chatUnreadCount({ messageCount, seenCount: stored ?? messageCount, open });
}
