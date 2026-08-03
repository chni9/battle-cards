/**
 * Last-human leave policy — technical spec v3 §11 #V3-3 (b), L15-06.
 *
 * Mid-game: keep the room, bots play out, write on natural game over.
 * Lobby: zero humans with bots remaining → dispose, write nothing.
 */

export function shouldKeepRoomAlive(input: {
  hasBots: boolean;
  hasStarted: boolean;
  winnerPlayerId: string | null;
}): boolean {
  return input.hasBots && input.hasStarted && input.winnerPlayerId === null;
}

export function shouldDisposeLobbyWithOnlyBots(input: {
  hasStarted: boolean;
  humanSeatCount: number;
  botSeatCount: number;
}): boolean {
  return !input.hasStarted && input.humanSeatCount === 0 && input.botSeatCount > 0;
}
