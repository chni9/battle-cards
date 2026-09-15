import { describe, expect, it } from 'vitest';

import {
  addBotRejectionMessage,
  canAddBot,
  canChooseKit,
  canKickPlayer,
  canRemoveBot,
  canSetBotDifficulty,
  canSetReady,
  canStartGame,
  chooseKitRejectionMessage,
  collectForcedKitsBySeatId,
  kickPlayerRejectionMessage,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  parseChooseKitPayload,
  parseKickPlayerPayload,
  parseSetReadyPayload,
  removeBotRejectionMessage,
  setBotDifficultyRejectionMessage,
  setReadyRejectionMessage,
  startGameRejectionMessage,
} from './lobby-rules';

describe('lobby rules (L1-02)', () => {
  it(`caps the room at ${MAX_PLAYERS} players`, () => {
    expect(MAX_PLAYERS).toBe(8);
  });

  it(`requires ${MIN_PLAYERS_TO_START} players to start`, () => {
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: 1,
        hasStarted: false,
        humanGuests: [],
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
        humanGuests: [{ isReady: true, isConnected: true }],
      }),
    ).toBe('not-host');
  });

  it('allows the host to start with bots and no human guests', () => {
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: 2,
        hasStarted: false,
        humanGuests: [],
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
        humanGuests: [],
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
      expect(addBotRejectionMessage('room-full').message).toMatch(String(MAX_PLAYERS));
    });

    it('still allows a bot at MAX_PLAYERS − 1', () => {
      expect(canAddBot({ ...base, seatCount: MAX_PLAYERS - 1 })).toBeNull();
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

  describe('chooseKit (L49-01)', () => {
    it('allows a pick while the lobby is open', () => {
      expect(canChooseKit({ hasStarted: false })).toBeNull();
    });

    it('rejects a pick after start', () => {
      expect(canChooseKit({ hasStarted: true })).toBe('already-started');
      expect(chooseKitRejectionMessage('already-started').code).toBe('choose-kit-already-started');
    });

    it('parses a catalog kit and random', () => {
      expect(parseChooseKitPayload({ kitId: 'assassin' })).toEqual({
        ok: true,
        value: { kitId: 'assassin' },
      });
      expect(parseChooseKitPayload({ kitId: 'random' })).toEqual({
        ok: true,
        value: { kitId: 'random' },
      });
    });

    it('rejects a malformed payload and an unknown kit id', () => {
      const missing = parseChooseKitPayload(undefined);
      expect(missing).toEqual({ ok: false, code: 'invalid-choose-kit-payload' });
      const badType = parseChooseKitPayload({ kitId: 3 });
      expect(badType).toEqual({ ok: false, code: 'invalid-choose-kit-payload' });
      expect(parseChooseKitPayload({ kitId: 'not-a-kit' })).toEqual({
        ok: false,
        code: 'kit-unavailable',
      });
    });

    it('omits forced kits when every seat stayed random', () => {
      const selections = new Map([
        ['a', 'random' as const],
        ['b', 'random' as const],
      ]);
      expect(collectForcedKitsBySeatId(selections)).toBeUndefined();
    });

    it('collects only catalog picks', () => {
      const selections = new Map([
        ['a', 'assassin' as const],
        ['b', 'random' as const],
      ]);
      expect(collectForcedKitsBySeatId(selections)).toEqual(new Map([['a', 'assassin']]));
    });
  });
});

describe('lobby ready gate (L57-08)', () => {
  const hostStart = {
    requesterSessionId: 'host',
    hostSessionId: 'host',
    seatCount: 2,
    hasStarted: false,
  } as const;

  it('blocks start when a connected guest is not ready', () => {
    expect(
      canStartGame({
        ...hostStart,
        humanGuests: [{ isReady: false, isConnected: true }],
      }),
    ).toBe('not-all-ready');
    expect(startGameRejectionMessage('not-all-ready').code).toBe('start-not-all-ready');
  });

  it('allows start when every connected guest is ready', () => {
    expect(
      canStartGame({
        ...hostStart,
        seatCount: 3,
        humanGuests: [
          { isReady: true, isConnected: true },
          { isReady: true, isConnected: true },
        ],
      }),
    ).toBeNull();
  });

  it('allows host plus bots with no human guests (solo / tutorial)', () => {
    expect(
      canStartGame({
        ...hostStart,
        humanGuests: [],
      }),
    ).toBeNull();
  });

  it('blocks start when a reserved guest is disconnected', () => {
    expect(
      canStartGame({
        ...hostStart,
        humanGuests: [{ isReady: false, isConnected: false }],
      }),
    ).toBe('not-all-ready');
  });

  it('rejects host and non-guest setReady', () => {
    expect(
      canSetReady({
        hasStarted: false,
        requesterIsHost: true,
        requesterIsHumanGuest: false,
      }),
    ).toBe('not-allowed');
    expect(
      canSetReady({
        hasStarted: false,
        requesterIsHost: false,
        requesterIsHumanGuest: false,
      }),
    ).toBe('not-allowed');
    expect(setReadyRejectionMessage('not-allowed').code).toBe('ready-not-allowed');
  });

  it('rejects setReady after start', () => {
    expect(
      canSetReady({
        hasStarted: true,
        requesterIsHost: false,
        requesterIsHumanGuest: true,
      }),
    ).toBe('not-in-lobby');
    expect(setReadyRejectionMessage('not-in-lobby').code).toBe('ready-not-in-lobby');
  });

  it('allows a human guest to toggle Ready in the lobby', () => {
    expect(
      canSetReady({
        hasStarted: false,
        requesterIsHost: false,
        requesterIsHumanGuest: true,
      }),
    ).toBeNull();
  });

  it('parses setReady payloads', () => {
    expect(parseSetReadyPayload({ ready: true })).toEqual({
      ok: true,
      value: { ready: true },
    });
    expect(parseSetReadyPayload({ ready: false })).toEqual({
      ok: true,
      value: { ready: false },
    });
    expect(parseSetReadyPayload(undefined)).toEqual({
      ok: false,
      code: 'invalid-set-ready-payload',
    });
    expect(parseSetReadyPayload({ ready: 'yes' })).toEqual({
      ok: false,
      code: 'invalid-set-ready-payload',
    });
  });
});

describe('lobby kick (L57-09)', () => {
  const hostKick = {
    requesterSessionId: 'host',
    hostSessionId: 'host',
    hasStarted: false,
    targetExists: true,
    targetIsSelf: false,
  } as const;

  it('allows the host to kick another lobby seat', () => {
    expect(canKickPlayer(hostKick)).toBeNull();
  });

  it('rejects kick-self and non-host', () => {
    expect(canKickPlayer({ ...hostKick, targetIsSelf: true })).toBe('self');
    expect(kickPlayerRejectionMessage('self').code).toBe('kick-self');
    expect(canKickPlayer({ ...hostKick, requesterSessionId: 'guest' })).toBe('not-host');
    expect(kickPlayerRejectionMessage('not-host').code).toBe('kick-not-host');
  });

  it('rejects kick after start and unknown seats', () => {
    expect(canKickPlayer({ ...hostKick, hasStarted: true })).toBe('not-in-lobby');
    expect(canKickPlayer({ ...hostKick, targetExists: false })).toBe('unknown');
    expect(kickPlayerRejectionMessage('unknown').code).toBe('kick-unknown');
  });

  it('parses kickPlayer payloads', () => {
    expect(parseKickPlayerPayload({ playerId: 'guest' })).toEqual({
      ok: true,
      value: { playerId: 'guest' },
    });
    expect(parseKickPlayerPayload({})).toEqual({
      ok: false,
      code: 'invalid-kick-payload',
    });
  });
});
