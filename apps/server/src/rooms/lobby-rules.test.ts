import { describe, expect, it } from 'vitest';

import { canStartGame, MAX_PLAYERS, MIN_PLAYERS_TO_START } from './lobby-rules';

describe('lobby rules (L1-02)', () => {
  it(`caps the room at ${MAX_PLAYERS} players`, () => {
    expect(MAX_PLAYERS).toBe(4);
  });

  it(`requires ${MIN_PLAYERS_TO_START} players to start`, () => {
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: 1,
        hasStarted: false,
      }),
    ).toBe('not-enough-players');
  });

  it('rejects start from a non-host', () => {
    expect(
      canStartGame({
        requesterSessionId: 'guest',
        hostSessionId: 'host',
        seatCount: 2,
        hasStarted: false,
      }),
    ).toBe('not-host');
  });

  it('allows the host to start with two or more players', () => {
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: 2,
        hasStarted: false,
      }),
    ).toBeNull();
  });

  it('rejects start once the game has begun', () => {
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: 2,
        hasStarted: true,
      }),
    ).toBe('already-started');
  });
});
