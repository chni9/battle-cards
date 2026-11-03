// @vitest-environment happy-dom
/**
 * The room's last lobby rules — technical spec v7 §6.10 source (1), §6.11; L74-21, L74-26 gate G19.
 *
 * A solo launch sends its rules, the bots and START_GAME in one go, so the lobby views carrying
 * the chosen rules arrive back to back with the first playing view, and React may render only the
 * last of them. The connection keeps the rules of every lobby STATE_UPDATE it receives, so the
 * turn clock and Menu → Table rules never show the room's first, default rules.
 */
import { defaultLobbyRules, STATE_UPDATE, type LobbyRules } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../test/render'; // act environment and per-test cleanup (L72-06)
import { cachedLobbyRules } from '../view-model/rules-recall';
import { makeLobbyView, makePlayingView } from '../view-model/test-fixtures';
import { useRoomConnection } from './use-room-connection';

const fake = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  leave: vi.fn<(consented?: boolean) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('@colyseus/sdk', () => ({
  Client: class {
    create(): Promise<unknown> {
      return Promise.resolve({
        roomId: 'ROOM01',
        reconnectionToken: 'token',
        reconnection: { enabled: false, maxRetries: 0, maxDelay: 0, minDelay: 0 },
        send: () => undefined,
        leave: fake.leave,
        onDrop: () => undefined,
        onMessage: (type: string, handler: (payload: unknown) => void) => {
          fake.handlers.set(type, handler);
        },
        onError: () => undefined,
        onReconnect: () => undefined,
        onLeave: () => undefined,
      });
    }
  },
}));

const rules = (turnTimeSeconds: number): LobbyRules => ({ ...defaultLobbyRules(), turnTimeSeconds });

function deliver(...payloads: unknown[]): void {
  const handler = fake.handlers.get(STATE_UPDATE);
  if (handler === undefined) throw new Error('no STATE_UPDATE handler');
  act(() => {
    for (const payload of payloads) handler(payload);
  });
}

async function connected() {
  const hook = renderHook(() => useRoomConnection());
  await act(async () => {
    await hook.result.current.createGame('Ada');
  });
  return hook;
}

describe('the room keeps its last lobby rules into play (L74-26 gate G19)', () => {
  beforeEach(() => {
    fake.handlers.clear();
    vi.clearAllMocks();
  });

  it('keeps the rules of the last lobby view even when it lands in the same batch as the first playing view', async () => {
    const { result } = await connected();
    const playing = makePlayingView({ gameCode: 'ROOM01' });
    // The solo launch: the default rules, then the chosen 30 s, then play, with no render between.
    deliver(
      makeLobbyView({ gameCode: 'ROOM01', lobbyRules: rules(60) }),
      makeLobbyView({ gameCode: 'ROOM01', lobbyRules: rules(30) }),
      playing,
    );
    expect(result.current.view?.phase).toBe('playing');
    expect(cachedLobbyRules(result.current.lobbyRules, playing)?.turnTimeSeconds).toBe(30);
  });

  it('takes every new lobby view (Play again brings the edited rules) and gives nothing for another room', async () => {
    const { result } = await connected();
    deliver(makeLobbyView({ gameCode: 'ROOM01', lobbyRules: rules(180) }));
    deliver(makeLobbyView({ gameCode: 'ROOM01', lobbyRules: rules(45) }));
    expect(result.current.lobbyRules?.rules.turnTimeSeconds).toBe(45);
    expect(cachedLobbyRules(result.current.lobbyRules, makePlayingView({ gameCode: 'ROOM02' }))).toBeNull();
  });

  it('forgets the rules when the player leaves', async () => {
    const { result } = await connected();
    deliver(makeLobbyView({ gameCode: 'ROOM01', lobbyRules: rules(180) }), makePlayingView({ gameCode: 'ROOM01' }));
    expect(result.current.lobbyRules?.rules.turnTimeSeconds).toBe(180);
    await act(async () => {
      await result.current.leaveGame();
    });
    expect(result.current.lobbyRules).toBeNull();
  });
});
