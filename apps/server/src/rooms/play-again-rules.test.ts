import { describe, expect, it } from 'vitest';

import {
  canPlayAgain,
  canSeatSpectatorAsLobbyGuest,
  optedInHumanIdsInPriorOrder,
  playAgainRejectionMessage,
  recapHumanSeats,
  reformingLobbySeats,
  resolveReformingHost,
  shouldPersistFinishedGame,
} from './play-again-rules';
import type { Seat } from './seats';

function human(sessionId: string, nickname: string): Seat {
  return { kind: 'human', sessionId, nickname };
}

function bot(sessionId: string, nickname: string): Seat {
  return { kind: 'bot', sessionId, nickname, difficulty: 'normal' };
}

describe('play again (L57-10)', () => {
  it('rejects tutorial and in-progress matches', () => {
    expect(
      canPlayAgain({ playKind: 'tutorial', winnerPlayerId: 'a', reforming: false }),
    ).toBe('tutorial');
    expect(playAgainRejectionMessage('tutorial').code).toBe('play-again-tutorial');
    expect(
      canPlayAgain({ playKind: 'classic', winnerPlayerId: null, reforming: false }),
    ).toBe('not-finished');
    expect(playAgainRejectionMessage('not-finished').code).toBe('play-again-not-finished');
  });

  it('allows the first Play again after a Classic finish and later reforming clicks', () => {
    expect(
      canPlayAgain({ playKind: 'classic', winnerPlayerId: 'a', reforming: false }),
    ).toBeNull();
    expect(
      canPlayAgain({ playKind: 'classic', winnerPlayerId: 'a', reforming: true }),
    ).toBeNull();
  });

  it('reclaims the original host when they opt in', () => {
    expect(
      resolveReformingHost({
        originalHostSessionId: 'host',
        optedInHumanIdsInPriorSeatOrder: ['guest', 'host'],
      }),
    ).toBe('host');
  });

  it('gives host to the first remaining opted-in human in prior seat order', () => {
    expect(
      resolveReformingHost({
        originalHostSessionId: 'host',
        optedInHumanIdsInPriorSeatOrder: ['guest-b', 'guest-c'],
      }),
    ).toBe('guest-b');
    expect(
      optedInHumanIdsInPriorOrder(['host', 'guest-b', 'guest-c'], new Set(['guest-c', 'guest-b'])),
    ).toEqual(['guest-b', 'guest-c']);
    expect(
      optedInHumanIdsInPriorOrder(['host'], new Set(['host', 'late-join'])),
    ).toEqual(['host', 'late-join']);
  });

  it('keeps bots and only opted-in humans in the reforming lobby', () => {
    const seats = [
      human('host', 'Ada'),
      human('guest', 'Bea'),
      bot('bot-1', 'Alpha'),
    ];
    const opted = new Set(['guest']);
    expect(reformingLobbySeats(seats, opted).map((seat) => seat.sessionId)).toEqual([
      'guest',
      'bot-1',
    ]);
    expect(recapHumanSeats(seats, opted).map((seat) => seat.sessionId)).toEqual(['host']);
  });

  it('writes the finished game once per match', () => {
    expect(shouldPersistFinishedGame(false)).toBe(true);
    expect(shouldPersistFinishedGame(true)).toBe(false);
  });

  it('seats walk-in spectators only while occupancy is below MAX_PLAYERS (L57-14)', () => {
    expect(canSeatSpectatorAsLobbyGuest(1)).toBe(true);
    expect(canSeatSpectatorAsLobbyGuest(7)).toBe(true);
    expect(canSeatSpectatorAsLobbyGuest(8)).toBe(false);
  });
});
