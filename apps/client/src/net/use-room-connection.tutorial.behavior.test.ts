// @vitest-environment happy-dom
/**
 * startTutorialGame over a mocked Colyseus client: L45-04, L46-03; technical spec v7 §12.1 (Owner
 * lot 76 row `net/use-room-connection.tutorial.test.ts`, L76-08). The source-text test stays beside
 * it: the hook does not change (§4.1), as with the forfeit and clear-spy behavior tests.
 */
import { CLIENT_READY, GAME_ROOM_NAME, PROTOCOL_VERSION, START_GAME } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../test/render'; // act environment and per-test cleanup (L72-06)
import { HINTS_STORAGE_KEY } from '../ui/help-storage';
import { useRoomConnection } from './use-room-connection';

const fake = vi.hoisted(() => ({
  create: vi.fn<(roomName: string, options: unknown) => void>(),
  send: vi.fn<(type: string, payload?: unknown) => void>(),
  leave: vi.fn<(consented?: boolean) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('@colyseus/sdk', () => ({
  Client: class {
    create(roomName: string, options: unknown): Promise<unknown> {
      fake.create(roomName, options);
      return Promise.resolve({
        roomId: 'TUTOR1',
        reconnectionToken: 'token',
        reconnection: { enabled: false, maxRetries: 0, maxDelay: 0, minDelay: 0 },
        send: fake.send,
        leave: fake.leave,
        onDrop: () => undefined,
        onMessage: () => undefined,
        onError: () => undefined,
        onReconnect: () => undefined,
        onLeave: () => undefined,
      });
    }
  },
}));

describe('startTutorialGame (L45-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // keeps `leave`'s resolved implementation
    localStorage.clear();
  });

  it('creates a tutorial room with the trimmed nickname, then sends START_GAME alone: no rules, kit or bot', async () => {
    const { result } = renderHook(() => useRoomConnection());
    await act(async () => {
      await result.current.startTutorialGame('  Ana  ');
    });
    expect(fake.create.mock.calls).toEqual([[GAME_ROOM_NAME, { protocolVersion: PROTOCOL_VERSION, nickname: 'Ana', tutorial: true }]]);
    expect(fake.send.mock.calls.map(([type]) => type).filter((type) => type !== CLIENT_READY)).toEqual([START_GAME]);
    expect(result.current.soloLaunchPending).toBe(true);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull(); // L46-03: the tutorial never skips the first-game hints
  });
});
