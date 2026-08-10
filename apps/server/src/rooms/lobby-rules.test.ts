import { describe, expect, it } from 'vitest';

import {
  addBotRejectionMessage,
  canAddBot,
  canRemoveBot,
  canSetBotDifficulty,
  canStartGame,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  removeBotRejectionMessage,
  setBotDifficultyRejectionMessage,
} from './lobby-rules';

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

describe('bot lobby rules (L15-03)', () => {
  const base = {
    requesterSessionId: 'host',
    hostSessionId: 'host',
    seatCount: 2,
    hasStarted: false,
  };

  describe('canAddBot', () => {
    it('allows the host to add a bot when there is a free seat', () => {
      expect(canAddBot(base)).toBeNull();
    });

    it('rejects a non-host', () => {
      expect(canAddBot({ ...base, requesterSessionId: 'guest' })).toBe('not-host');
      expect(addBotRejectionMessage('not-host').message).toBe('Only the host can add a bot.');
    });

    it('rejects once the game has started', () => {
      expect(canAddBot({ ...base, hasStarted: true })).toBe('already-started');
      expect(addBotRejectionMessage('already-started').message).toMatch(/has started/);
    });

    it('rejects when the room is full', () => {
      expect(canAddBot({ ...base, seatCount: MAX_PLAYERS })).toBe('room-full');
      expect(addBotRejectionMessage('room-full').message).toMatch(/full/);
    });
  });

  describe('canRemoveBot', () => {
    const removeBase = {
      requesterSessionId: 'host',
      hostSessionId: 'host',
      hasStarted: false,
      targetExists: true,
      targetIsBot: true,
    };

    it('allows the host to remove an existing bot', () => {
      expect(canRemoveBot(removeBase)).toBeNull();
    });

    it('rejects a non-host', () => {
      expect(canRemoveBot({ ...removeBase, requesterSessionId: 'guest' })).toBe('not-host');
      expect(removeBotRejectionMessage('not-host').message).toBe('Only the host can remove a bot.');
    });

    it('rejects once the game has started', () => {
      expect(canRemoveBot({ ...removeBase, hasStarted: true })).toBe('already-started');
      expect(removeBotRejectionMessage('already-started').message).toMatch(/has started/);
    });

    it('rejects an unknown bot id', () => {
      expect(canRemoveBot({ ...removeBase, targetExists: false })).toBe('unknown-bot');
      expect(removeBotRejectionMessage('unknown-bot').message).toMatch(/not found/);
    });

    it('rejects when the target is a human seat', () => {
      expect(canRemoveBot({ ...removeBase, targetIsBot: false })).toBe('target-is-human');
      expect(removeBotRejectionMessage('target-is-human').message).toMatch(/human/);
    });
  });

  describe('canSetBotDifficulty', () => {
    const setBase = {
      requesterSessionId: 'host',
      hostSessionId: 'host',
      hasStarted: false,
      targetExists: true,
      targetIsBot: true,
    };

    it('allows the host to change an existing bot difficulty', () => {
      expect(canSetBotDifficulty(setBase)).toBeNull();
    });

    it('rejects a non-host', () => {
      expect(canSetBotDifficulty({ ...setBase, requesterSessionId: 'guest' })).toBe('not-host');
      expect(setBotDifficultyRejectionMessage('not-host').message).toMatch(/host/);
    });

    it('rejects once the game has started', () => {
      expect(canSetBotDifficulty({ ...setBase, hasStarted: true })).toBe('already-started');
      expect(setBotDifficultyRejectionMessage('already-started').message).toMatch(/has started/);
    });

    it('rejects an unknown bot id', () => {
      expect(canSetBotDifficulty({ ...setBase, targetExists: false })).toBe('unknown-bot');
      expect(setBotDifficultyRejectionMessage('unknown-bot').message).toMatch(/not found/);
    });

    it('rejects when the target is a human seat', () => {
      expect(canSetBotDifficulty({ ...setBase, targetIsBot: false })).toBe('target-is-human');
      expect(setBotDifficultyRejectionMessage('target-is-human').message).toMatch(/human/);
    });
  });
});
