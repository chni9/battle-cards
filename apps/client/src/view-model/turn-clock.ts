/**
 * Turn clock model — technical spec v7 §6.10 (and §4.1, §13 Q19 / Q33 / Q65); Lot 73 (L73-13).
 *
 * Parity: Appendix A `table-turn-timer-scale` and `turn-strip-timers`. Pure: the caller passes
 * `nowMs` (§4.3), so this module never reads the clock, and it never imports `rules-recall.ts`:
 * Lot 74 passes `cachedLobbyRules(cache, view)` (L73-12) in as `cachedLobbyRules`.
 *
 * Seconds come from `view.turnDeadlineMs` only. A `TURN_STARTED` record gives the full turn
 * length, never the seconds, so a stale human record during a bot turn cannot draw a countdown.
 *
 * How Lot 74 keeps the record: call `nextTurnStartedRecord` once per new `lastTurnStarted`
 * identity, with `{ turnSequence: view.turnSequence, deadlineMs: lastTurnStarted.deadlineMs,
 * receivedAtMs: nowMs }` taken from the playing view current at receive time. The server sends
 * the state before `TURN_STARTED` on a new turn (`game-room.ts`: `beginTurnOrAbsentAutoPlay` →
 * `sendStateToEveryone` → `broadcastTurnStarted`), so that view already carries the new
 * `turnSequence`. A resume does not advance `turnSequence` (`resumeTimersOwnedBy`), which is why
 * the record keeps the first sighting.
 */

import type { LobbyRules, PlayingStateView } from '@card-battle/shared';

export const TURN_CLOCK_MODES = ['countdown', 'paused', 'absent', 'none'] as const;
export type TurnClockMode = (typeof TURN_CLOCK_MODES)[number];

/** Spec v7 §6.10: the last 10 s show in `--danger`. */
export const TURN_CLOCK_DANGER_SECONDS = 10;
/** Spec v7 §6.10: the last 5 s tick (L79). */
export const TURN_CLOCK_TICK_SECONDS = 5;

// The three idle labels are the V2 `screens/table.tsx` strings, reused verbatim (U+2014 em dash).
// `table.tsx` keeps its inline copies until L75 replaces it: L73 changes nothing player-visible.
export const TURN_CLOCK_NONE_LABEL = '—';
export const TURN_CLOCK_PAUSED_LABEL = 'Paused — reconnecting';
export const TURN_CLOCK_ABSENT_LABEL = 'Absent — auto-draw';

export type TurnLengthSource = 'lobby-rules' | 'turn-started';

/** First `TURN_STARTED` sighting of a turn (contract). Gives the length only, never the seconds. */
export interface TurnStartedRecord {
  turnSequence: number;
  deadlineMs: number;
  receivedAtMs: number;
}

export interface TurnClockInput {
  turnStarted: TurnStartedRecord | null;
  view: PlayingStateView;
  cachedLobbyRules: LobbyRules | null;
  /** True on the finished board, which never ticks (spec v7 §6.10). */
  readOnly: boolean;
  nowMs: number;
}

export interface TurnClockIdle {
  mode: Exclude<TurnClockMode, 'countdown'>;
  label: string;
}

export interface TurnClockCountdown {
  mode: 'countdown';
  /** `ceil(max(0, deadline − now) / 1000)`. */
  secondsLeft: number;
  /** `${secondsLeft}s`. */
  label: string;
  /** Null: seconds only, no bar. */
  lengthMs: number | null;
  lengthSource: TurnLengthSource | null;
  /** `remaining / length`, clamped to [0, 1]. */
  ratio: number | null;
  /** `secondsLeft ≤ TURN_CLOCK_DANGER_SECONDS`. */
  danger: boolean;
  /** `secondsLeft ≤ TURN_CLOCK_TICK_SECONDS`. */
  tick: boolean;
}

export type TurnClockModel = TurnClockIdle | TurnClockCountdown;

interface TurnLength {
  lengthMs: number;
  source: TurnLengthSource;
}

/**
 * The full length of this turn, by source: (1) the host's cached `turnTimeSeconds`, else (2) the
 * first `TURN_STARTED` of this `turnSequence`, else none (spec v7 §6.10).
 */
function turnLength(
  rules: LobbyRules | null,
  record: TurnStartedRecord | null,
  turnSequence: number,
): TurnLength | null {
  if (rules !== null) return { lengthMs: rules.turnTimeSeconds * 1000, source: 'lobby-rules' };
  if (record?.turnSequence !== turnSequence) return null;
  // A first sighting already past its deadline (the client clock is ahead of the server's) gives
  // no length rather than a zero or negative one, so the ratio never divides by zero.
  const lengthMs = record.deadlineMs - record.receivedAtMs;
  return lengthMs > 0 ? { lengthMs, source: 'turn-started' } : null;
}

/**
 * What the turn strip shows (spec v7 §6.10). Modes are checked in this order: `none` for the
 * tutorial and the finished board; `paused` while the active seat is disconnected; `absent` while
 * it is absent with no deadline; `none` for any other null deadline (a bot turn, no active
 * seat); else `countdown`. Paused and absent come before the null-deadline `none` because the
 * server nulls `turnDeadlineMs` when a turn starts on a disconnected seat (`game-room.ts`
 * `beginTurnOrAbsentAutoPlay`), which `docs/agent/decisions.md` records (L73-13).
 */
export function turnClock(input: TurnClockInput): TurnClockModel {
  const { turnStarted, view, cachedLobbyRules, readOnly, nowMs } = input;
  if (readOnly || view.playKind === 'tutorial') return { mode: 'none', label: TURN_CLOCK_NONE_LABEL };

  const active = view.players.find((player) => player.id === view.currentTurnPlayerId);
  const deadlineMs = view.turnDeadlineMs;
  if (active?.connection.status === 'disconnected') {
    return { mode: 'paused', label: TURN_CLOCK_PAUSED_LABEL };
  }
  if (active?.connection.status === 'absent' && deadlineMs === null) {
    return { mode: 'absent', label: TURN_CLOCK_ABSENT_LABEL };
  }
  if (active === undefined || deadlineMs === null) return { mode: 'none', label: TURN_CLOCK_NONE_LABEL };

  // Clamped at 0: a deadline already past shows "0s", never a negative number (and `Math.max`
  // returns +0, so the seconds are never −0).
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const length = turnLength(cachedLobbyRules, turnStarted, view.turnSequence);
  return {
    mode: 'countdown',
    secondsLeft,
    label: `${String(secondsLeft)}s`,
    lengthMs: length?.lengthMs ?? null,
    lengthSource: length?.source ?? null,
    // Capped at 1 because a first sighting can come mid-turn (walk-in, claim, resume) and the
    // server can restart a full turn on the same `turnSequence` (`turnAdvanced === false`).
    ratio: length === null ? null : Math.min(1, remainingMs / length.lengthMs),
    danger: secondsLeft <= TURN_CLOCK_DANGER_SECONDS,
    tick: secondsLeft <= TURN_CLOCK_TICK_SECONDS,
  };
}

/** Record step: keep the first sighting for its `turnSequence` (a resume keeps the length). */
export function nextTurnStartedRecord(
  previous: TurnStartedRecord | null,
  sighting: TurnStartedRecord,
): TurnStartedRecord {
  return previous?.turnSequence === sighting.turnSequence ? previous : sighting;
}
