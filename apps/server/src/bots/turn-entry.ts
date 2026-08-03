/**
 * Pure turn-entry classification — technical spec v3 §4.2 (L15-04).
 * Bot branch must win before connected / absent / disconnected.
 */

import type { ConnectionStatus } from '@card-battle/shared';

import type { Seat } from '../rooms/seats';
import { isBotSeat } from '../rooms/seats';

export type TurnEntryKind = 'bot' | 'absent' | 'disconnected' | 'human';

export function classifyTurnEntry(
  seat: Seat | undefined,
  connectionStatus: ConnectionStatus | undefined,
): TurnEntryKind {
  if (seat !== undefined && isBotSeat(seat)) {
    return 'bot';
  }

  if (connectionStatus === 'absent') {
    return 'absent';
  }

  if (connectionStatus === 'disconnected') {
    return 'disconnected';
  }

  return 'human';
}

export type RewardRouteKind = 'bot' | 'human-client' | 'human-dropped';

export function classifyRewardRoute(
  seat: Seat | undefined,
  hasClient: boolean,
): RewardRouteKind {
  if (seat !== undefined && isBotSeat(seat)) {
    return 'bot';
  }

  if (hasClient) {
    return 'human-client';
  }

  return 'human-dropped';
}
