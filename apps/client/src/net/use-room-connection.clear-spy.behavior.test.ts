// @vitest-environment happy-dom
/**
 * clearSpy over a mocked room (L58-07): the behavior half of the `use-room-connection.clear-spy`
 * product-behavior row (docs/backlog_v7_test_classification.md, Owner lot 74; spec v7 §12.1).
 * The hook is unchanged (§4.1), so the old source-text test stays beside this one.
 */
import { CLEAR_SPY } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '../test/render'; // act environment and per-test cleanup (L72-06)
import { useRoomConnection } from './use-room-connection';

const fake = vi.hoisted(() => ({
  room: {
    roomId: 'ABCDEF',
    reconnectionToken: 'token',
    reconnection: { enabled: false, maxRetries: 0, maxDelay: 0, minDelay: 0 },
    send: vi.fn<(type: string, payload?: unknown) => void>(),
    leave: vi.fn<(consented?: boolean) => Promise<void>>(() => Promise.resolve()),
    onMessage: vi.fn(),
    onError: vi.fn(),
    onDrop: vi.fn(),
    onReconnect: vi.fn(),
    onLeave: vi.fn(),
  },
}));

vi.mock('@colyseus/sdk', () => ({
  Client: class {
    joinById(): Promise<typeof fake.room> {
      return Promise.resolve(fake.room);
    }
  },
}));

describe('clearSpy intent (L58-07)', () => {
  it('sends CLEAR_SPY once with the picked seat over the joined room', async () => {
    const { result } = renderHook(() => useRoomConnection());
    await act(async () => {
      await result.current.joinGame('abcdef', 'Ana');
    });
    expect(result.current.status).toBe('connected');
    act(() => {
      result.current.clearSpy('p2');
    });
    expect(fake.room.send.mock.calls.filter(([type]) => type === CLEAR_SPY)).toEqual([[CLEAR_SPY, { targetPlayerId: 'p2' }]]);
  });
});
