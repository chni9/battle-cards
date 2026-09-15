/**
 * Join-by-code spectate / claim — PROTOCOL_VERSION 32 / L57-13.
 * Pure so picker eligibility is unit-tested without a Colyseus room.
 *
 * Claimable = living human seats whose socket is gone. Eliminated seats
 * (including after the third absent autodraw) are never listed.
 */

import {
  actionReject,
  MAX_PLAYERS,
  MAX_SPECTATORS,
  type ActionReject,
  type ActionRejectCode,
  type ClaimableSeatView,
  type ClaimSeatPayload,
  type ConnectionStatus,
} from '@card-battle/shared';

import { isHumanSeat, type Seat } from './seats';

export type ClaimSeatRejection = 'unknown' | 'not-claimable';

export type LobbyJoinKind = 'sit' | 'spectate' | 'reject-full' | 'reject-spectate-full';

export function spectatorJoinAllowed(
  spectatorCount: number,
  maxSpectators: number = MAX_SPECTATORS,
): boolean {
  return spectatorCount < maxSpectators;
}

export function isPlayingSeatClaimable(
  player: {
    id: string;
    isEliminated: boolean;
    connectionState: { status: ConnectionStatus };
  },
  botIds: ReadonlySet<string>,
): boolean {
  return (
    !player.isEliminated &&
    !botIds.has(player.id) &&
    player.connectionState.status !== 'connected'
  );
}

export function listPlayingClaimableSeats(input: {
  players: readonly {
    id: string;
    nickname: string;
    isEliminated: boolean;
    connectionState: { status: ConnectionStatus };
  }[];
  botIds: ReadonlySet<string>;
}): ClaimableSeatView[] {
  return input.players
    .filter((player) => isPlayingSeatClaimable(player, input.botIds))
    .map((player) => ({ playerId: player.id, nickname: player.nickname }));
}

export function listLobbyClaimableSeats(
  seats: readonly Seat[],
  connectedPlayerIds: ReadonlySet<string>,
): ClaimableSeatView[] {
  return seats.filter(isHumanSeat).flatMap((seat) => {
    if (connectedPlayerIds.has(seat.sessionId)) {
      return [];
    }

    return [{ playerId: seat.sessionId, nickname: seat.nickname }];
  });
}

export function lobbyJoinKind(input: {
  hasStarted: boolean;
  seatCount: number;
  claimableCount: number;
  spectatorCount: number;
  maxPlayers?: number;
  maxSpectators?: number;
}): LobbyJoinKind {
  const maxPlayers = input.maxPlayers ?? MAX_PLAYERS;
  const maxSpectators = input.maxSpectators ?? MAX_SPECTATORS;

  if (input.hasStarted) {
    return spectatorJoinAllowed(input.spectatorCount, maxSpectators)
      ? 'spectate'
      : 'reject-spectate-full';
  }

  if (input.seatCount < maxPlayers) {
    return 'sit';
  }

  if (input.claimableCount > 0) {
    return spectatorJoinAllowed(input.spectatorCount, maxSpectators)
      ? 'spectate'
      : 'reject-spectate-full';
  }

  return 'reject-full';
}

export function canClaimSeat(input: {
  targetExists: boolean;
  isClaimable: boolean;
}): ClaimSeatRejection | null {
  if (!input.targetExists) {
    return 'unknown';
  }

  if (!input.isClaimable) {
    return 'not-claimable';
  }

  return null;
}

export function claimSeatRejectionMessage(reason: ClaimSeatRejection): ActionReject {
  switch (reason) {
    case 'unknown':
      return actionReject('claim-unknown');
    case 'not-claimable':
      return actionReject('claim-not-claimable');
  }
}

export function parseClaimSeatPayload(
  payload: unknown,
): { ok: true; value: ClaimSeatPayload } | { ok: false; code: ActionRejectCode } {
  if (typeof payload !== 'object' || payload === null || !('playerId' in payload)) {
    return { ok: false, code: 'invalid-claim-payload' };
  }

  const { playerId } = payload;

  if (typeof playerId !== 'string' || playerId.length === 0) {
    return { ok: false, code: 'invalid-claim-payload' };
  }

  return { ok: true, value: { playerId } };
}
