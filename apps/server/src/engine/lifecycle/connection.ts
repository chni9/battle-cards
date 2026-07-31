/**
 * Connection status transitions — technical spec §5.7.
 *
 * Pure mutations on `Player.connectionState`. Timers and Colyseus hooks stay in the room.
 */

import type { ConnectionState, Player } from '@card-battle/shared';

import { ABSENT_AUTO_TURN_LIMIT, CONNECTED_TIMEOUT_LIMIT } from './constants';

export function markDisconnected(player: Player, nowMs: number): void {
  player.connectionState = {
    status: 'disconnected',
    disconnectedAt: nowMs,
    automaticTurnsTaken: player.connectionState.automaticTurnsTaken,
    consecutiveTimeouts: player.connectionState.consecutiveTimeouts,
  };
}

export function markAbsent(player: Player): void {
  if (player.connectionState.status !== 'disconnected') {
    return;
  }

  player.connectionState = {
    ...player.connectionState,
    status: 'absent',
  };
}

/**
 * Any reconnection resets the 60s window and the absent auto-turn counter.
 * Does **not** reset `consecutiveTimeouts` (independent inactivity mechanism).
 */
export function markReconnected(player: Player): void {
  player.connectionState = {
    status: 'connected',
    disconnectedAt: null,
    automaticTurnsTaken: 0,
    consecutiveTimeouts: player.connectionState.consecutiveTimeouts,
  };
}

/** @returns true when the player should be eliminated for absence. */
export function recordAbsentAutoTurn(player: Player): boolean {
  player.connectionState = {
    ...player.connectionState,
    automaticTurnsTaken: player.connectionState.automaticTurnsTaken + 1,
  };

  return player.connectionState.automaticTurnsTaken >= ABSENT_AUTO_TURN_LIMIT;
}

/** @returns true when the player should be eliminated for connected inactivity. */
export function recordConnectedTimeout(player: Player): boolean {
  player.connectionState = {
    ...player.connectionState,
    consecutiveTimeouts: player.connectionState.consecutiveTimeouts + 1,
  };

  return player.connectionState.consecutiveTimeouts >= CONNECTED_TIMEOUT_LIMIT;
}

export function resetConnectedTimeouts(player: Player): void {
  if (player.connectionState.consecutiveTimeouts === 0) {
    return;
  }

  player.connectionState = {
    ...player.connectionState,
    consecutiveTimeouts: 0,
  };
}

export function isPastReconnectGrace(
  connection: ConnectionState,
  nowMs: number,
  graceMs: number,
): boolean {
  if (connection.status !== 'disconnected' || connection.disconnectedAt === null) {
    return false;
  }

  return nowMs - connection.disconnectedAt >= graceMs;
}

export function remainingMs(deadlineMs: number, nowMs: number): number {
  return Math.max(0, deadlineMs - nowMs);
}
