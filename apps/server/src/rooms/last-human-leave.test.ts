import { describe, expect, it } from 'vitest';

import {
  shouldDisposeLobbyWithOnlyBots,
  shouldKeepRoomAlive,
} from './last-human-leave';

describe('last human leave (#V3-3b / L15-06)', () => {
  it('keeps an in-progress bot room alive with no human sockets', () => {
    expect(
      shouldKeepRoomAlive({
        hasBots: true,
        hasStarted: true,
        winnerPlayerId: null,
      }),
    ).toBe(true);
  });

  it('does not keep the room after game over', () => {
    expect(
      shouldKeepRoomAlive({
        hasBots: true,
        hasStarted: true,
        winnerPlayerId: 'bot-1',
      }),
    ).toBe(false);
  });

  it('does not keep a human-only in-progress room for this rule', () => {
    expect(
      shouldKeepRoomAlive({
        hasBots: false,
        hasStarted: true,
        winnerPlayerId: null,
      }),
    ).toBe(false);
  });

  it('disposes a lobby that has only bots left', () => {
    expect(
      shouldDisposeLobbyWithOnlyBots({
        hasStarted: false,
        humanSeatCount: 0,
        botSeatCount: 2,
      }),
    ).toBe(true);
  });

  it('does not dispose a lobby that still has a human', () => {
    expect(
      shouldDisposeLobbyWithOnlyBots({
        hasStarted: false,
        humanSeatCount: 1,
        botSeatCount: 2,
      }),
    ).toBe(false);
  });
});
