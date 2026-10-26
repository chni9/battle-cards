/**
 * What one chat line shows, as data (rules spec §6 Chat; technical spec v7 §6.9, §7.5): the
 * round stamp, the sender's seat, and whether the line belongs to the side stream (eliminated
 * players and spectators), which living readers never receive. Pure, so the transcript only
 * lays it out.
 *
 * The three labels are the existing chat copy. Technical spec v7 §10.6 adds no chat string,
 * and a walk-in's label arrives as a prop (L76).
 */

import { chatRoundLabel, type ChatMessageView } from '@card-battle/shared';

import { seatIndexOf, type SeatIndex } from '../seat-colors';

export const CHAT_EMPTY_COPY = 'No messages yet.';
export const CHAT_INPUT_LABEL = 'Message';
export const CHAT_SEND_LABEL = 'Send';

export interface ChatLineView {
  /** `ChatMessageView.order`: unique per message, so a React key that survives growth and shrink. */
  readonly key: number;
  readonly roundLabel: string;
  readonly nickname: string;
  /** `null` for a sender who is not in the player list (a walk-in, a kicked player). */
  readonly seatIndex: SeatIndex | null;
  /** Eliminated and spectator lines: the stream living readers never see. */
  readonly side: boolean;
  /** `(eliminated)` or `(spectator)` on a side line, else `null`. */
  readonly roleLabel: string | null;
  readonly body: string;
}

export function chatLineView(message: ChatMessageView, players: readonly { id: string }[]): ChatLineView {
  const side = message.role !== 'living';

  return {
    key: message.order,
    roundLabel: chatRoundLabel(message.round),
    nickname: message.nickname,
    seatIndex: seatIndexOf({ players }, message.senderId),
    side,
    roleLabel: side ? `(${message.role})` : null,
    body: message.body,
  };
}
