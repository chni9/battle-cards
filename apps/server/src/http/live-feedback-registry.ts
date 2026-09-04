/**
 * In-process live GameRoom snapshots for feedback enrichment (L47-02).
 * Seed-free: callers must not close over GameState.seed.
 */

import type { ActionLogEntryView, PlayKind } from '@card-battle/shared';
import { FEEDBACK_LOG_TAIL_MAX, PROTOCOL_VERSION } from '@card-battle/shared';

export interface LiveFeedbackContext {
  gameCode: string;
  playKind: PlayKind;
  protocolVersion: number;
  logTail: readonly ActionLogEntryView[];
}

type LiveFeedbackSnapshot = () => LiveFeedbackContext;

const liveRooms = new Map<string, LiveFeedbackSnapshot>();

export function registerLiveFeedbackRoom(
  gameCode: string,
  snapshot: LiveFeedbackSnapshot,
): void {
  liveRooms.set(gameCode, snapshot);
}

export function unregisterLiveFeedbackRoom(gameCode: string): void {
  liveRooms.delete(gameCode);
}

export function lookupLiveFeedbackContext(gameCode: string): LiveFeedbackContext | null {
  const snapshot = liveRooms.get(gameCode);
  if (snapshot === undefined) {
    return null;
  }
  const context = snapshot();
  return {
    gameCode: context.gameCode,
    playKind: context.playKind,
    protocolVersion: context.protocolVersion,
    logTail: context.logTail.slice(-FEEDBACK_LOG_TAIL_MAX),
  };
}

export function liveFeedbackContextFrom(
  gameCode: string,
  playKind: PlayKind,
  logTail: readonly ActionLogEntryView[],
): LiveFeedbackContext {
  return {
    gameCode,
    playKind,
    protocolVersion: PROTOCOL_VERSION,
    logTail: logTail.slice(-FEEDBACK_LOG_TAIL_MAX),
  };
}

/** Test-only: empty the map between cases. */
export function resetLiveFeedbackRegistryForTests(): void {
  liveRooms.clear();
}
