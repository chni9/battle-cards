/**
 * Lobby launch rules — technical spec §5.2 startGame, §7 lobby.
 * Pure so the reject cases are unit-tested without a Colyseus room.
 */

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS_TO_START = 2;

export type StartGameRejection =
  | 'not-host'
  | 'already-started'
  | 'not-enough-players';

export function canStartGame(input: {
  requesterSessionId: string;
  hostSessionId: string;
  seatCount: number;
  hasStarted: boolean;
}): StartGameRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (input.seatCount < MIN_PLAYERS_TO_START) {
    return 'not-enough-players';
  }

  return null;
}

export function startGameRejectionMessage(reason: StartGameRejection): string {
  switch (reason) {
    case 'not-host':
      return 'Only the host can start the game.';
    case 'already-started':
      return 'The game has already started.';
    case 'not-enough-players':
      return `Need at least ${MIN_PLAYERS_TO_START} players to start.`;
  }
}
