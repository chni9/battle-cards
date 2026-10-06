import { describe, expect, it } from 'vitest';

import {
  CHAT_BODY_MAX_LENGTH,
  chatMessagesForReader,
  chatRoundLabel,
  tableRound,
  type ChatMessageView,
} from './table-chat';

const living: ChatMessageView = {
  order: 0,
  senderId: 'a',
  nickname: 'Ada',
  role: 'living',
  body: 'hello',
  round: 1,
};

const eliminated: ChatMessageView = {
  order: 1,
  senderId: 'b',
  nickname: 'Bea',
  role: 'eliminated',
  body: 'out',
  round: 2,
};

const spectator: ChatMessageView = {
  order: 2,
  senderId: 'w',
  nickname: 'Wes',
  role: 'spectator',
  body: 'watching',
  round: 2,
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

  it('labels the lobby as lobby and a table pass as Round', () => {
    expect(tableRound(0, 4)).toBe(1);
    expect(tableRound(4, 4)).toBe(2);
    expect(tableRound(31, 1)).toBe(32);
    expect(chatRoundLabel(0)).toBe('Lobby');
    expect(chatRoundLabel(32)).toBe('Round 32');
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
