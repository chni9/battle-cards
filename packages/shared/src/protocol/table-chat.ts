/**
 * In-game chat — rules spec §6 Chat.
 * Living readers see only the living stream. Eliminated players and spectators
 * also see the side stream. Role is fixed at send time.
 */

export const CHAT_BODY_MAX_LENGTH = 200;

export const CHAT_AUTHOR_ROLES = ['living', 'eliminated', 'spectator'] as const;

export type ChatAuthorRole = (typeof CHAT_AUTHOR_ROLES)[number];

export interface ChatMessageView {
  order: number;
  senderId: string;
  nickname: string;
  role: ChatAuthorRole;
  body: string;
}

export function isChatAuthorRole(value: unknown): value is ChatAuthorRole {
  return (
    typeof value === 'string' &&
    (CHAT_AUTHOR_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Messages this reader may see. A living reader does not receive the side stream.
 */
export function chatMessagesForReader(input: {
  messages: readonly ChatMessageView[];
  readerIsSpectator: boolean;
  readerIsEliminated: boolean;
}): readonly ChatMessageView[] {
  if (input.readerIsSpectator || input.readerIsEliminated) {
    return input.messages;
  }

  return input.messages.filter((message) => message.role === 'living');
}
