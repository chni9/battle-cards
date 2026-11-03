// @vitest-environment happy-dom
/**
 * FORFEIT intent behavior — L43-06 / technical spec v6 §6.3; spec v7 §12.1. This is the
 * replacement (1) of the Owner lot 74 `forfeit` classification row. The source-text test
 * `use-room-connection.forfeit.test.ts` stays, because the hook does not change.
 */
import { CLIENT_READY, FORFEIT } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../test/render'; // act environment and per-test cleanup (L72-06)
import { useRoomConnection } from './use-room-connection';

const fake = vi.hoisted(() => ({
  send: vi.fn<(type: string, payload?: unknown) => void>(),
  leave: vi.fn<(consented?: boolean) => Promise<void>>(() => Promise.resolve()),
  onDrop: vi.fn<(callback: () => void) => void>(),
}));

vi.mock('@colyseus/sdk', () => ({
  Client: class {
    create(): Promise<unknown> {
      return Promise.resolve({
        roomId: 'ABCDEF',
        reconnectionToken: 'token',
        reconnection: { enabled: false, maxRetries: 0, maxDelay: 0, minDelay: 0 },
        send: fake.send,
        leave: fake.leave,
        onDrop: fake.onDrop,
        onMessage: () => undefined,
        onError: () => undefined,
        onReconnect: () => undefined,
        onLeave: () => undefined,
      });
    }
  },
}));

describe('forfeit intent behavior (L43-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // keeps `leave`'s resolved implementation, clears the recorded calls
  });

  it('sends FORFEIT once and keeps the room and the connection', async () => {
    const { result } = renderHook(() => useRoomConnection());
    await act(async () => {
      await result.current.createGame('Ada');
    });
    expect(result.current.status).toBe('connected');
    expect(fake.send).toHaveBeenCalledWith(CLIENT_READY);
    act(() => {
      result.current.forfeit();
    });
    expect(fake.send.mock.calls.filter(([type]) => type === FORFEIT)).toHaveLength(1);
    expect(fake.leave).not.toHaveBeenCalled();
    expect(result.current.status).toBe('connected');
  });

  it('still reconnects on a drop after a forfeit (intentionalLeave stays unset)', async () => {
    const { result } = renderHook(() => useRoomConnection());
    await act(async () => {
      await result.current.createGame('Ada');
    });
    act(() => {
      result.current.forfeit();
    });
    const drop = fake.onDrop.mock.calls.at(-1)?.[0];
    if (drop === undefined) {
      throw new Error('onDrop was not registered');
    }
    act(() => {
      drop();
    });
    expect(result.current.status).toBe('reconnecting');
  });
});
