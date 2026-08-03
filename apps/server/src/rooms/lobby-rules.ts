/**
 * Lobby launch rules — technical spec §5.2 startGame, §7 lobby;
 * bot lobby intents — technical spec v3 §4.1, §6 (L15-03).
 * Pure so the reject cases are unit-tested without a Colyseus room.
 */

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS_TO_START = 2;

export type StartGameRejection =
  | 'not-host'
  | 'already-started'
  | 'not-enough-players';

export type AddBotRejection = 'not-host' | 'already-started' | 'room-full';

export type RemoveBotRejection =
  | 'not-host'
  | 'already-started'
  | 'unknown-bot'
  | 'target-is-human';

export type SetBotDifficultyRejection =
  | 'not-host'
  | 'already-started'
  | 'unknown-bot'
  | 'target-is-human';

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

export function canAddBot(input: {
  requesterSessionId: string;
  hostSessionId: string;
  seatCount: number;
  hasStarted: boolean;
}): AddBotRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (input.seatCount >= MAX_PLAYERS) {
    return 'room-full';
  }

  return null;
}

export function addBotRejectionMessage(reason: AddBotRejection): string {
  switch (reason) {
    case 'not-host':
      return 'Only the host can add a bot.';
    case 'already-started':
      return 'Cannot add a bot after the game has started.';
    case 'room-full':
      return `Room is full (${MAX_PLAYERS} seats).`;
  }
}

export function canRemoveBot(input: {
  requesterSessionId: string;
  hostSessionId: string;
  hasStarted: boolean;
  targetExists: boolean;
  targetIsBot: boolean;
}): RemoveBotRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (!input.targetExists) {
    return 'unknown-bot';
  }

  if (!input.targetIsBot) {
    return 'target-is-human';
  }

  return null;
}

export function removeBotRejectionMessage(reason: RemoveBotRejection): string {
  switch (reason) {
    case 'not-host':
      return 'Only the host can remove a bot.';
    case 'already-started':
      return 'Cannot remove a bot after the game has started.';
    case 'unknown-bot':
      return 'That bot seat was not found.';
    case 'target-is-human':
      return 'That seat is a human player, not a bot.';
  }
}

export function canSetBotDifficulty(input: {
  requesterSessionId: string;
  hostSessionId: string;
  hasStarted: boolean;
  targetExists: boolean;
  targetIsBot: boolean;
}): SetBotDifficultyRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (!input.targetExists) {
    return 'unknown-bot';
  }

  if (!input.targetIsBot) {
    return 'target-is-human';
  }

  return null;
}

export function setBotDifficultyRejectionMessage(reason: SetBotDifficultyRejection): string {
  switch (reason) {
    case 'not-host':
      return 'Only the host can change a bot difficulty.';
    case 'already-started':
      return 'Cannot change bot difficulty after the game has started.';
    case 'unknown-bot':
      return 'That bot seat was not found.';
    case 'target-is-human':
      return 'That seat is a human player, not a bot.';
  }
}
