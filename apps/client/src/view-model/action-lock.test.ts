import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { actionLock, type ActionContext } from './action-lock';
import { makePlayer, makePlayingView } from './test-fixtures';

const FREE: ActionContext = { subChoice: null, readOnly: false };
const SLOT_DROP: SubChoiceRequiredPayload = { kind: 'slot-drop', slotOwnerPlayerId: 'me', eligibleSlots: [], deadlineMs: 0 };
const ELIMINATED_ME = [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')];

describe('actionLock (spec v7 §11; V2 table.tsx actionsLocked)', () => {
  it('is null on your own turn with nothing open', () => {
    expect(actionLock(makePlayingView(), FREE)).toBeNull();
  });
  it("is not-your-turn on another seat's turn and between turns", () => {
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1' }), FREE)).toBe('not-your-turn');
    expect(actionLock(makePlayingView({ currentTurnPlayerId: null }), FREE)).toBe('not-your-turn');
  });
  it.each<[string, PlayingStateView, ActionContext]>([
    ['the finished board', makePlayingView(), { subChoice: null, readOnly: true }],
    ['an open sub-choice', makePlayingView(), { subChoice: SLOT_DROP, readOnly: false }],
    ['an eliminated POV', makePlayingView({ players: ELIMINATED_ME }), FREE],
    ['a walk-in spectator', makePlayingView({ isSpectator: true }), FREE],
  ])('is actions-locked for %s', (_label, view, ctx) => {
    expect(actionLock(view, ctx)).toBe('actions-locked');
  });
  it('reports actions-locked before not-your-turn', () => {
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1', players: ELIMINATED_ME }), FREE)).toBe('actions-locked');
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1' }), { subChoice: SLOT_DROP, readOnly: false })).toBe('actions-locked');
  });
});
