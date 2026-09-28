/**
 * Classic Play again — same room/code (L57-10).
 * Per-recipient reforming: opted-in seats see lobby; others keep the recap.
 */

import {
  actionReject,
  type ActionReject,
  type PlayKind,
} from '@card-battle/shared';

import { isBotSeat, isHumanSeat, occupancyIsFull, type HumanSeat, type Seat } from './seats';

export type PlayAgainRejection = 'not-finished' | 'tutorial';

export function canPlayAgain(input: {
  playKind: PlayKind;
  winnerPlayerId: string | null;
  reforming: boolean;
}): PlayAgainRejection | null {
  if (input.playKind === 'tutorial') {
    return 'tutorial';
  }

  if (input.winnerPlayerId === null && !input.reforming) {
    return 'not-finished';
  }

  return null;
}

export function playAgainRejectionMessage(reason: PlayAgainRejection): ActionReject {
  switch (reason) {
    case 'not-finished':
      return actionReject('play-again-not-finished');
    case 'tutorial':
      return actionReject('play-again-tutorial');
  }
}

/**
 * Original host reclaims if they opted in; otherwise first remaining opted-in
 * human in the prior match seat order.
 */
export function resolveReformingHost(input: {
  originalHostSessionId: string | null;
  optedInHumanIdsInPriorSeatOrder: readonly string[];
}): string | null {
  if (
    input.originalHostSessionId !== null &&
    input.optedInHumanIdsInPriorSeatOrder.includes(input.originalHostSessionId)
  ) {
    return input.originalHostSessionId;
  }

  return input.optedInHumanIdsInPriorSeatOrder[0] ?? null;
}

export function optedInHumanIdsInPriorOrder(
  priorHumanSeatOrder: readonly string[],
  optedIn: ReadonlySet<string>,
): string[] {
  const ordered = priorHumanSeatOrder.filter((id) => optedIn.has(id));

  for (const id of optedIn) {
    if (!ordered.includes(id)) {
      ordered.push(id);
    }
  }

  return ordered;
}

/** Lobby occupancy during reforming: bots always, humans only once opted in. */
export function reformingLobbySeats(
  seats: readonly Seat[],
  optedInHumanIds: ReadonlySet<string>,
): Seat[] {
  return seats.filter((seat) => isBotSeat(seat) || optedInHumanIds.has(seat.sessionId));
}

export function recapHumanSeats(
  seats: readonly Seat[],
  optedInHumanIds: ReadonlySet<string>,
): HumanSeat[] {
  return seats.filter(isHumanSeat).filter((seat) => !optedInHumanIds.has(seat.sessionId));
}

/** One write per finished match; the next Start is a new persist. */
export function shouldPersistFinishedGame(alreadyPersisted: boolean): boolean {
  return !alreadyPersisted;
}

/** Walk-in watchers sit as guests while Classic occupancy still has a free seat (L57-14). */
export function canSeatSpectatorAsLobbyGuest(seatCount: number): boolean {
  return !occupancyIsFull(seatCount);
}
