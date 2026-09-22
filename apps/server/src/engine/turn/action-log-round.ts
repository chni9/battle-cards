/**
 * Public action-log round (the UI “Round N” grouping).
 * Same formula as client `roundOfTurn`: floor(turnSequence / seatCount) + 1.
 * Seat count is the seated table, including eliminated players — matching
 * `view.players.length` on the log. Designer 2026-09-21.
 */

import type { GameState } from '@card-battle/shared';

export function actionLogRound(state: GameState): number {
  const seatCount = Math.max(1, state.players.length);
  return Math.floor(state.turnSequence / seatCount) + 1;
}
