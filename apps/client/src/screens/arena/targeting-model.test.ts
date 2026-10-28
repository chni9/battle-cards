/**
 * Targeting model: technical spec v7 §6.6.2, §6.6.5 (L74-10).
 */
import type { PlayingStateView } from '@card-battle/shared';
import { describe, expect, it, vi } from 'vitest';

import type { ActionContext } from '../../view-model/action-lock';
import { makeCard, makePersistent, makePlayer, makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import { EMPTY_ARENA_SHEETS, type ArenaSheetsState, type TargetingState } from './arena-sheets';
import { liveTargeting, seatTargetFor, targetSeatLabel } from './targeting-model';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const SPY = makeCard('spy', { instanceId: 'spy-1' });
const TARGETING: TargetingState = { sheetKey: 'card:spy-1', instanceId: 'spy-1', seatIds: ['p1', 'p2'] };
/** The Spy card sheet, collapsed into targeting. */
const TARGETED: ArenaSheetsState = { open: [{ kind: 'card', source: { kind: 'hand', instance: SPY } }], closing: [], targeting: TARGETING };
const INVISIBLE = makePersistent({ id: 'inv', cardId: 'invisibility', counter: 2 });
const view = (overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makePlayingView({ self: makeSelf({ points: 10, hand: [SPY] }), ...overrides });

describe('liveTargeting (§6.6.2)', () => {
  it('re-reads the seat set from the current model', () => {
    const p1Invisible = view({ players: [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [INVISIBLE] }), makePlayer('p2')] });
    expect(liveTargeting(view(), LIVE, TARGETED)).toEqual(TARGETING);
    expect(liveTargeting(p1Invisible, LIVE, TARGETED)).toEqual({ ...TARGETING, seatIds: ['p2'] });
  });

  it('ends when the card left the hand', () => {
    expect(liveTargeting(view({ self: makeSelf({ points: 10 }) }), LIVE, TARGETED)).toBeNull();
  });

  it('ends off-turn, while a sub-choice is open, and once no seat is left', () => {
    const allInvisible = view({
      players: [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [INVISIBLE] }), makePlayer('p2', { activePersistentEffects: [INVISIBLE] })],
    });
    expect(liveTargeting(view({ currentTurnPlayerId: 'p1' }), LIVE, TARGETED)).toBeNull();
    expect(liveTargeting(view(), { subChoice: { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 }, readOnly: false }, TARGETED)).toBeNull();
    expect(liveTargeting(allInvisible, LIVE, TARGETED)).toBeNull();
  });

  it('is null without targeting', () => {
    expect(liveTargeting(view(), LIVE, EMPTY_ARENA_SHEETS)).toBeNull();
  });
});

describe('seat targets (§6.6.5)', () => {
  it('names a valid seat "{nickname}, target" and marks every other seat invalid', () => {
    const onTarget = vi.fn<(playerId: string) => void>();
    const targeting = { key: 'card:spy-1', seatIds: ['p2'], onTarget };
    expect(targetSeatLabel('Ana')).toBe('Ana, target');
    expect(seatTargetFor(undefined, 'p2')).toBeNull();
    expect(seatTargetFor(targeting, 'p1')).toEqual({ kind: 'invalid' });
    const valid = seatTargetFor(targeting, 'p2');
    if (valid?.kind !== 'valid') throw new Error('p2 should be a valid target');
    valid.onTarget();
    expect(onTarget.mock.calls).toEqual([['p2']]);
  });
});
