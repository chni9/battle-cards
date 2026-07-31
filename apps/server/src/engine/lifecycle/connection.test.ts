/**
 * Lifecycle connection transitions — technical spec §5.7, L7-01…L7-03.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  ABSENT_AUTO_TURN_LIMIT,
  CONNECTED_TIMEOUT_LIMIT,
  RECONNECT_GRACE_MS,
} from './constants';
import {
  isPastReconnectGrace,
  markAbsent,
  markDisconnected,
  markReconnected,
  recordAbsentAutoTurn,
  recordConnectedTimeout,
  remainingMs,
  resetConnectedTimeouts,
} from './connection';

function twoPlayerState() {
  return createInitialState({
    seats: [
      { id: 'a', nickname: 'Alice' },
      { id: 'b', nickname: 'Bob' },
    ],
    seed: 'lifecycle-seed',
  });
}

describe('connection lifecycle (L7-01)', () => {
  it('marks disconnected with disconnectedAt and reconnects with no penalty at 40s', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    const t0 = 1_000_000;
    markDisconnected(alice, t0);

    expect(alice.connectionState.status).toBe('disconnected');
    expect(alice.connectionState.disconnectedAt).toBe(t0);
    expect(isPastReconnectGrace(alice.connectionState, t0 + 40_000, RECONNECT_GRACE_MS)).toBe(
      false,
    );

    markReconnected(alice);

    expect(alice.connectionState.status).toBe('connected');
    expect(alice.connectionState.disconnectedAt).toBeNull();
    expect(alice.connectionState.automaticTurnsTaken).toBe(0);
  });

  it('preserves remaining deadline ms when pausing', () => {
    const now = 5_000;
    const deadline = 12_000;

    expect(remainingMs(deadline, now)).toBe(7_000);
    expect(remainingMs(deadline, 20_000)).toBe(0);
  });

  it('becomes absent after the grace window', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    const t0 = 1_000_000;
    markDisconnected(alice, t0);
    expect(isPastReconnectGrace(alice.connectionState, t0 + RECONNECT_GRACE_MS, RECONNECT_GRACE_MS)).toBe(
      true,
    );

    markAbsent(alice);
    expect(alice.connectionState.status).toBe('absent');
  });
});

describe('absent auto-turns (L7-02)', () => {
  it('eliminates after ABSENT_AUTO_TURN_LIMIT automatic turns', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    markDisconnected(alice, 0);
    markAbsent(alice);

    for (let i = 1; i < ABSENT_AUTO_TURN_LIMIT; i += 1) {
      expect(recordAbsentAutoTurn(alice)).toBe(false);
    }

    expect(recordAbsentAutoTurn(alice)).toBe(true);
    expect(alice.connectionState.automaticTurnsTaken).toBe(ABSENT_AUTO_TURN_LIMIT);
  });

  it('resets automaticTurnsTaken on reconnect while absent', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    markDisconnected(alice, 0);
    markAbsent(alice);
    recordAbsentAutoTurn(alice);
    recordAbsentAutoTurn(alice);
    markReconnected(alice);

    expect(alice.connectionState.status).toBe('connected');
    expect(alice.connectionState.automaticTurnsTaken).toBe(0);
    expect(alice.connectionState.consecutiveTimeouts).toBe(0);
  });
});

describe('connected inactivity (L7-03)', () => {
  it('eliminates after CONNECTED_TIMEOUT_LIMIT consecutive timeouts', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    for (let i = 1; i < CONNECTED_TIMEOUT_LIMIT; i += 1) {
      expect(recordConnectedTimeout(alice)).toBe(false);
    }

    expect(recordConnectedTimeout(alice)).toBe(true);
  });

  it('resets consecutiveTimeouts on a successful action, not on reconnect', () => {
    const state = twoPlayerState();
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    recordConnectedTimeout(alice);
    recordConnectedTimeout(alice);
    recordConnectedTimeout(alice);
    resetConnectedTimeouts(alice);
    expect(alice.connectionState.consecutiveTimeouts).toBe(0);

    recordConnectedTimeout(alice);
    recordConnectedTimeout(alice);
    markDisconnected(alice, 0);
    markReconnected(alice);
    expect(alice.connectionState.consecutiveTimeouts).toBe(2);
  });
});
