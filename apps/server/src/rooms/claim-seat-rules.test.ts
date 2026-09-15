/**
 * Spectate / claim helpers — L57-13.
 */

import { describe, expect, it } from 'vitest';

import { parseReconnectGraceMs } from '../engine/lifecycle/constants';
import {
  canClaimSeat,
  claimSeatRejectionMessage,
  isPlayingSeatClaimable,
  listLobbyClaimableSeats,
  listPlayingClaimableSeats,
  lobbyJoinKind,
  parseClaimSeatPayload,
  spectatorJoinAllowed,
} from './claim-seat-rules';
import type { Seat } from './seats';

function human(sessionId: string, nickname: string): Seat {
  return { kind: 'human', sessionId, nickname };
}

function bot(sessionId: string, nickname: string): Seat {
  return { kind: 'bot', sessionId, nickname, difficulty: 'normal' };
}

describe('reconnect grace parse (L57-13)', () => {
  it('defaults to 30s and falls back to 30s on invalid env', () => {
    expect(parseReconnectGraceMs(undefined)).toBe(30_000);
    expect(parseReconnectGraceMs('not-a-number')).toBe(30_000);
    expect(parseReconnectGraceMs('500')).toBe(30_000);
    expect(parseReconnectGraceMs('5000')).toBe(5_000);
  });
});

describe('playing claimable seats (L57-13)', () => {
  const botIds = new Set(['bot-1']);

  it('lists living disconnected humans and skips bots, connected, and dead seats', () => {
    const listed = listPlayingClaimableSeats({
      botIds,
      players: [
        {
          id: 'ada',
          nickname: 'Ada',
          isEliminated: false,
          connectionState: { status: 'disconnected' },
        },
        {
          id: 'ada-2',
          nickname: 'Ada',
          isEliminated: false,
          connectionState: { status: 'absent' },
        },
        {
          id: 'bob',
          nickname: 'Bob',
          isEliminated: false,
          connectionState: { status: 'connected' },
        },
        {
          id: 'dead',
          nickname: 'Dead',
          isEliminated: true,
          connectionState: { status: 'absent' },
        },
        {
          id: 'bot-1',
          nickname: 'Alpha',
          isEliminated: false,
          connectionState: { status: 'disconnected' },
        },
      ],
    });

    expect(listed).toEqual([
      { playerId: 'ada', nickname: 'Ada' },
      { playerId: 'ada-2', nickname: 'Ada' },
    ]);
  });

  it('drops a seat from the picker after absence elimination', () => {
    const dead = {
      id: 'ada',
      nickname: 'Ada',
      isEliminated: true,
      connectionState: { status: 'absent' as const },
    };

    expect(isPlayingSeatClaimable(dead, new Set())).toBe(false);
    expect(listPlayingClaimableSeats({ players: [dead], botIds: new Set() })).toEqual([]);
  });
});

describe('lobby reserved seats (L57-13)', () => {
  it('lists disconnected human seats and ignores bots and connected humans', () => {
    const seats: Seat[] = [
      human('host', 'Host'),
      human('ada', 'Ada'),
      bot('bot-1', 'Alpha'),
    ];

    expect(listLobbyClaimableSeats(seats, new Set(['host']))).toEqual([
      { playerId: 'ada', nickname: 'Ada' },
    ]);
  });
});

describe('join kind (L57-13)', () => {
  it('sits in a free lobby slot and spectates a started match', () => {
    expect(
      lobbyJoinKind({
        hasStarted: false,
        seatCount: 2,
        claimableCount: 0,
        spectatorCount: 0,
      }),
    ).toBe('sit');
    expect(
      lobbyJoinKind({
        hasStarted: true,
        seatCount: 8,
        claimableCount: 1,
        spectatorCount: 0,
      }),
    ).toBe('spectate');
  });

  it('spectates a full lobby only when a reserved seat is claimable', () => {
    expect(
      lobbyJoinKind({
        hasStarted: false,
        seatCount: 8,
        claimableCount: 1,
        spectatorCount: 0,
      }),
    ).toBe('spectate');
    expect(
      lobbyJoinKind({
        hasStarted: false,
        seatCount: 8,
        claimableCount: 0,
        spectatorCount: 0,
      }),
    ).toBe('reject-full');
  });

  it('rejects walk-in when spectator occupancy is full', () => {
    expect(spectatorJoinAllowed(7)).toBe(true);
    expect(spectatorJoinAllowed(8)).toBe(false);
    expect(
      lobbyJoinKind({
        hasStarted: true,
        seatCount: 8,
        claimableCount: 0,
        spectatorCount: 8,
      }),
    ).toBe('reject-spectate-full');
  });
});

describe('claimSeat payload (L57-13)', () => {
  it('parses playerId and maps reject reasons', () => {
    expect(parseClaimSeatPayload({ playerId: 'ada' })).toEqual({
      ok: true,
      value: { playerId: 'ada' },
    });
    expect(parseClaimSeatPayload({})).toEqual({ ok: false, code: 'invalid-claim-payload' });
    expect(canClaimSeat({ targetExists: false, isClaimable: false })).toBe('unknown');
    expect(canClaimSeat({ targetExists: true, isClaimable: false })).toBe('not-claimable');
    expect(canClaimSeat({ targetExists: true, isClaimable: true })).toBeNull();
    expect(claimSeatRejectionMessage('unknown').code).toBe('claim-unknown');
    expect(claimSeatRejectionMessage('not-claimable').code).toBe('claim-not-claimable');
  });
});
