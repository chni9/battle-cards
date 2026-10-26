import type { ChatMessageView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_LOG_LABEL, CHAT_SEND_LABEL, chatLineView } from './chat-line';

const PLAYERS = [{ id: 'p-ana' }, { id: 'p-bo' }];
const message = (o: Partial<ChatMessageView>): ChatMessageView =>
  ({ order: 1, senderId: 'p-ana', nickname: 'Ana', role: 'living', body: 'gl hf', round: 0, ...o });

describe('chatLineView (rules spec §6 Chat, spec v7 §6.9)', () => {
  it('keeps the existing chat copy (spec v7 §10.6: no new strings)', () => {
    expect([CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_SEND_LABEL, CHAT_LOG_LABEL]).toEqual([
      'No messages yet.',
      'Message',
      'Send',
      'Chat',
    ]);
  });
  it('stamps a lobby line "Lobby" and a match line "Round N"', () => {
    expect(chatLineView(message({ round: 0 }), PLAYERS).roundLabel).toBe('Lobby');
    expect(chatLineView(message({ round: 3 }), PLAYERS).roundLabel).toBe('Round 3');
  });
  it('maps a living line to its seat with no role label', () => {
    expect(
      chatLineView(message({ order: 7, senderId: 'p-bo', nickname: 'Bo', body: 'watch out', round: 3 }), PLAYERS),
    ).toEqual({ key: 7, roundLabel: 'Round 3', nickname: 'Bo', seatIndex: 1, side: false, roleLabel: null, body: 'watch out' });
  });
  it('marks eliminated and spectator lines as side stream with their role label', () => {
    const eliminated = chatLineView(message({ role: 'eliminated' }), PLAYERS);
    const spectator = chatLineView(message({ senderId: 'walk-in', nickname: 'Cy', role: 'spectator' }), PLAYERS);
    expect([eliminated.side, eliminated.roleLabel]).toEqual([true, '(eliminated)']);
    expect([spectator.side, spectator.roleLabel]).toEqual([true, '(spectator)']);
  });
  it('gives no seat to a sender who is not in the player list', () => {
    expect(chatLineView(message({ senderId: 'walk-in' }), PLAYERS).seatIndex).toBeNull();
  });
});
