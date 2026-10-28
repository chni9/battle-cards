import { describe, expect, it } from 'vitest';

import type { ConnectionStatus, LobbyRules, PlayingStateView } from '@card-battle/shared';

import { makePlayer, makePlayingView } from './test-fixtures';
import {
  nextTurnStartedRecord,
  TURN_CLOCK_DANGER_SECONDS,
  TURN_CLOCK_TICK_SECONDS,
  turnClock,
  type TurnClockInput,
  type TurnClockModel,
  type TurnStartedRecord,
} from './turn-clock';

const NOW = 1_000_000;
const RULES_30: LobbyRules = { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 30 };

function clock(input: Partial<TurnClockInput>): TurnClockModel {
  return turnClock({ turnStarted: null, view: makePlayingView(), cachedLobbyRules: null, readOnly: false, nowMs: NOW, ...input });
}

/** `p1` is the active seat with this connection status. */
function activeP1(status: ConnectionStatus, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  const p1 = makePlayer('p1', { connection: {
    status,
    disconnectedAt: status === 'connected' ? null : NOW - 5_000,
    automaticTurnsTaken: status === 'absent' ? 1 : 0,
    consecutiveTimeouts: 0,
  } });
  return makePlayingView({
    currentTurnPlayerId: 'p1',
    players: [makePlayer('me', { isYou: true }), p1, makePlayer('p2')],
    ...overrides,
  });
}

/** The POV's human turn with `remainingMs` left on the server deadline. */
function countdownView(remainingMs: number, turnSequence = 1): PlayingStateView {
  return makePlayingView({ turnSequence, turnDeadlineMs: NOW + remainingMs });
}

describe('turnClock modes (spec v7 §6.10)', () => {
  it('is none in the tutorial, even with a deadline', () => {
    const view = makePlayingView({ playKind: 'tutorial', tutorialIndex: 0, turnDeadlineMs: NOW + 30_000 });
    expect(clock({ view, cachedLobbyRules: RULES_30 })).toEqual({ mode: 'none', label: '—' });
  });

  it('is none on the finished board, even with a disconnected last seat', () => {
    expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: null }), readOnly: true }))
      .toEqual({ mode: 'none', label: '—' });
  });

  it('is none on a bot turn after a human turn', () => {
    const humanTurn: TurnStartedRecord = { turnSequence: 5, deadlineMs: NOW + 20_000, receivedAtMs: NOW - 10_000 };
    const botTurn = makePlayingView({
      currentTurnPlayerId: 'p1', turnSequence: 6, turnDeadlineMs: null,
      players: [makePlayer('me', { isYou: true }), makePlayer('p1', { isBot: true, botDifficulty: 'normal' }), makePlayer('p2')],
    });
    expect(clock({ view: botTurn, turnStarted: humanTurn, cachedLobbyRules: RULES_30 }))
      .toEqual({ mode: 'none', label: '—' });
  });

  it('is paused while the active seat is disconnected, with or without a deadline', () => {
    const paused = { mode: 'paused', label: 'Paused — reconnecting' };
    expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: NOW + 12_000 }), cachedLobbyRules: RULES_30 }))
      .toEqual(paused);
    expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: null }) })).toEqual(paused);
  });

  it('is absent when the active seat is absent with no deadline', () => {
    expect(clock({ view: activeP1('absent', { turnDeadlineMs: null }) }))
      .toEqual({ mode: 'absent', label: 'Absent — auto-draw' });
    expect(clock({ view: activeP1('absent', { turnDeadlineMs: NOW + 2_000 }) }).mode).toBe('countdown');
  });

  it('counts down a 30 s host turn with 15 s left at ratio 0.5', () => {
    expect(clock({ view: countdownView(15_000), cachedLobbyRules: RULES_30 })).toEqual({
      mode: 'countdown', secondsLeft: 15, label: '15s', lengthMs: 30_000,
      lengthSource: 'lobby-rules', ratio: 0.5, danger: false, tick: false,
    });
  });
});

describe('turnClock length fallbacks (spec v7 §6.10)', () => {
  it('prefers the cached lobby length over a TURN_STARTED record', () => {
    const record = { turnSequence: 1, deadlineMs: NOW + 15_000, receivedAtMs: NOW - 45_000 };
    expect(clock({ view: countdownView(15_000), turnStarted: record, cachedLobbyRules: RULES_30 }))
      .toMatchObject({ lengthMs: 30_000, lengthSource: 'lobby-rules', ratio: 0.5 });
  });

  it('falls back to the first TURN_STARTED seen for this turn', () => {
    const record = { turnSequence: 1, deadlineMs: NOW + 30_000, receivedAtMs: NOW - 10_000 };
    expect(clock({ view: countdownView(30_000), turnStarted: record }))
      .toMatchObject({ secondsLeft: 30, lengthMs: 40_000, lengthSource: 'turn-started', ratio: 0.75 });
  });

  it('keeps the original length when a resume TURN_STARTED arrives for the same turn', () => {
    const first = nextTurnStartedRecord(null, { turnSequence: 4, deadlineMs: NOW + 25_000, receivedAtMs: NOW - 20_000 });
    const resumed = nextTurnStartedRecord(first, { turnSequence: 4, deadlineMs: NOW + 18_000, receivedAtMs: NOW });
    expect(resumed).toBe(first);
    expect(clock({ view: countdownView(18_000, 4), turnStarted: resumed })).toMatchObject({
      mode: 'countdown', secondsLeft: 18, lengthMs: 45_000, lengthSource: 'turn-started', ratio: 0.4,
    });
  });

  it('gives seconds only with no cached rules and no record', () => {
    expect(clock({ view: countdownView(15_000) })).toEqual({
      mode: 'countdown', secondsLeft: 15, label: '15s', lengthMs: null,
      lengthSource: null, ratio: null, danger: false, tick: false,
    });
  });

  it('ignores a record from another turnSequence', () => {
    const stale = { turnSequence: 3, deadlineMs: NOW + 15_000, receivedAtMs: NOW - 15_000 };
    expect(clock({ view: countdownView(15_000, 4), turnStarted: stale }))
      .toMatchObject({ secondsLeft: 15, lengthMs: null, lengthSource: null, ratio: null });
  });

  it('gives seconds only when the first sighting was already past its deadline', () => {
    const skewed = { turnSequence: 1, deadlineMs: NOW, receivedAtMs: NOW + 500 };
    expect(clock({ view: countdownView(2_000), turnStarted: skewed }))
      .toMatchObject({ secondsLeft: 2, lengthMs: null, lengthSource: null, ratio: null });
  });

  it('clamps the seconds at 0 and the ratio between 0 and 1', () => {
    expect(clock({ view: countdownView(-3_000), cachedLobbyRules: RULES_30 }))
      .toMatchObject({ secondsLeft: 0, label: '0s', ratio: 0, danger: true, tick: true });
    const lateFirstSighting = { turnSequence: 1, deadlineMs: NOW + 10_000, receivedAtMs: NOW };
    expect(clock({ view: countdownView(30_000), turnStarted: lateFirstSighting }))
      .toMatchObject({ lengthMs: 10_000, ratio: 1 });
  });
});

describe('turnClock danger and tick (spec v7 §6.10)', () => {
  it('names the thresholds', () => {
    expect(TURN_CLOCK_DANGER_SECONDS).toBe(10);
    expect(TURN_CLOCK_TICK_SECONDS).toBe(5);
  });

  it.each([
    [10_001, 11, false, false],
    [10_000, 10, true, false],
    [5_001, 6, true, false],
    [5_000, 5, true, true],
    [1, 1, true, true],
  ] as const)('with %i ms left shows %is, danger %s, tick %s', (remainingMs, secondsLeft, danger, tick) => {
    expect(clock({ view: countdownView(remainingMs), cachedLobbyRules: RULES_30 }))
      .toMatchObject({ secondsLeft, danger, tick });
  });
});

describe('nextTurnStartedRecord (spec v7 §6.10)', () => {
  it('keeps the first sighting for the same turnSequence and replaces it on a new turn', () => {
    const first: TurnStartedRecord = { turnSequence: 2, deadlineMs: NOW + 30_000, receivedAtMs: NOW };
    expect(nextTurnStartedRecord(null, first)).toBe(first);
    expect(nextTurnStartedRecord(first, { turnSequence: 2, deadlineMs: NOW + 40_000, receivedAtMs: NOW + 5_000 }))
      .toBe(first);
    const next = { turnSequence: 3, deadlineMs: NOW + 90_000, receivedAtMs: NOW + 30_000 };
    expect(nextTurnStartedRecord(first, next)).toBe(next);
  });
});
