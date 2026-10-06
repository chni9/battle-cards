import { describe, expect, it } from 'vitest';

import { CHAT_BODY_MAX_LENGTH, chatMessagesForReader, type ChatMessageView } from './table-chat';

const living: ChatMessageView = {
  order: 0,
  senderId: 'a',
  nickname: 'Ada',
  role: 'living',
  body: 'hello',
};

const eliminated: ChatMessageView = {
  order: 1,
  senderId: 'b',
  nickname: 'Bea',
  role: 'eliminated',
  body: 'out',
};

const spectator: ChatMessageView = {
  order: 2,
  senderId: 'w',
  nickname: 'Wes',
  role: 'spectator',
  body: 'watching',
};

describe('table chat visibility (rules spec §6 Chat)', () => {
  it('caps a message at 200 characters', () => {
    expect(CHAT_BODY_MAX_LENGTH).toBe(200);
  });

  it('shows a living reader only living messages', () => {
    expect(
      chatMessagesForReader({
        messages: [living, eliminated, spectator],
        readerIsSpectator: false,
        readerIsEliminated: false,
      }).map((message) => message.body),
    ).toEqual(['hello']);
  });

  it('lets an eliminated reader see both streams', () => {
    expect(
      chatMessagesForReader({
        messages: [living, eliminated, spectator],
        readerIsSpectator: false,
        readerIsEliminated: true,
      }).map((message) => message.role),
    ).toEqual(['living', 'eliminated', 'spectator']);
  });

  it('lets a spectator see both streams', () => {
    expect(
      chatMessagesForReader({
        messages: [living, eliminated, spectator],
        readerIsSpectator: true,
        readerIsEliminated: false,
      }).map((message) => message.role),
    ).toEqual(['living', 'eliminated', 'spectator']);
  });
});
