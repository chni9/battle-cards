/**
 * The `TURN_STARTED` record the arena's turn clock reads — technical spec v7 §4.1, §6.10 source (2);
 * `view-model/turn-clock.ts` (L73-13); L74-21.
 *
 * A sighting is recorded when `lastTurnStarted` changes identity, against the view current in that
 * render: the server sends the state before `TURN_STARTED` on a new turn, so that view already
 * carries the new `turnSequence` (the Lot 73 final review carry-forward "record against the view
 * current at receive time"). A resume sends `TURN_STARTED` first on the same `turnSequence`, and
 * `nextTurnStartedRecord` keeps the first sighting, so the turn keeps its length. `receivedAtMs` is
 * App's 250 ms `nowMs` tick, so it can be up to 250 ms early and the bar starts full.
 *
 * It uses React's "adjust state while rendering" pattern, as `arena-screen.tsx` does for targeting:
 * the record is derived from the props of this very render, never from an effect that would run a
 * frame late.
 */

import type { TurnStartedPayload } from '@card-battle/shared';
import { useState } from 'react';

import { nextTurnStartedRecord, type TurnStartedRecord } from '../../view-model/turn-clock';

export interface TurnStartedRecordInput {
  readonly lastTurnStarted: TurnStartedPayload | null;
  readonly turnSequence: number;
  /** `view.turnDeadlineMs`: at mount, only a payload for this deadline is recorded. */
  readonly turnDeadlineMs: number | null;
  readonly nowMs: number;
}

interface RecordState {
  /** The payload identity last looked at, so a render with the same payload records nothing. */
  readonly seen: TurnStartedPayload | null;
  readonly record: TurnStartedRecord | null;
}

/** The first `TURN_STARTED` sighting of the current turn; a resume on the same `turnSequence` keeps it (§6.10). */
export function useTurnStartedRecord({
  lastTurnStarted,
  turnSequence,
  turnDeadlineMs,
  nowMs,
}: TurnStartedRecordInput): TurnStartedRecord | null {
  const sightingOf = (payload: TurnStartedPayload): TurnStartedRecord => ({
    turnSequence,
    deadlineMs: payload.deadlineMs,
    receivedAtMs: nowMs,
  });
  const [state, setState] = useState<RecordState>(() => ({
    seen: lastTurnStarted,
    // The arena mounts at lobby → playing, and after Play again in one room the connection still
    // holds the previous game's payload: its deadline is not this turn's. Recording it would block
    // the real first sighting of the same `turnSequence`.
    record: lastTurnStarted !== null && lastTurnStarted.deadlineMs === turnDeadlineMs ? sightingOf(lastTurnStarted) : null,
  }));
  if (state.seen !== lastTurnStarted) {
    setState({
      seen: lastTurnStarted,
      record: lastTurnStarted === null ? state.record : nextTurnStartedRecord(state.record, sightingOf(lastTurnStarted)),
    });
  }
  return state.record;
}
