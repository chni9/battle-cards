/**
 * §10.2 — the sub-choice gate is one gate (technical spec v4 §4.4/§10.2, L20-18).
 *
 * Before this task the gate was split and asymmetric: `performTurnAction` rejected
 * on pending rewards only, `game-room.handleAction` blocked on Mirror only, and
 * `listLegalActions` checked neither. `hasActiveSubChoice` is now the one predicate
 * both consult — this file proves it holds for both sub-choice kinds.
 */
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { hasActiveSubChoice } from './sub-choice';
import { listLegalActions } from './list-legal-actions';
import { performTurnAction } from './perform-action';

describe('sub-choice gate is one gate (§10.2, L20-18)', () => {
  it('while Mirror is pending, listLegalActions returns nothing and performTurnAction rejects', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'sub-choice-gate-mirror',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 1;
    alice.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    const attack = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-1',
      targetPlayerId: 'b',
    });

    expect(attack.ok).toBe(true);

    state.currentTurnPlayerId = 'b';
    bob.points = 6;
    bob.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
    const mirrorPlay = performTurnAction(state, 'b', { type: 'playCard', instanceId: 'm-1' });

    expect(mirrorPlay.ok).toBe(true);

    if (!mirrorPlay.ok) {
      return;
    }

    expect(mirrorPlay.mirrorChoicePending).toBe(true);
    expect(state.mirrorChoice).not.toBeNull();
    expect(hasActiveSubChoice(state)).toBe(true);

    // The gate is symmetric: no ordinary TurnAction is enumerated for the Mirror
    // user (currentTurnPlayerId), and none of them would be accepted either.
    expect(listLegalActions(state, 'b')).toEqual([]);
    expect(listLegalActions(state, 'a')).toEqual([]);

    bob.points = 100;
    bob.hand = [{ instanceId: 'other', cardId: 'basic-attack', isUpgraded: false }];
    const rejected = performTurnAction(state, 'b', { type: 'draw' });

    expect(rejected.ok).toBe(false);
  });

  it('while an elimination reward is pending, listLegalActions returns nothing and performTurnAction rejects', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'sub-choice-gate-reward',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.lives = 10;
    a.pendingEffects = [];
    b.lives = 1;
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
      chosenInstanceId: null,
      },
    ];

    state.currentTurnPlayerId = b.id;
    const drawn = performTurnAction(state, b.id, { type: 'draw' });

    expect(drawn.ok).toBe(true);

    if (!drawn.ok) {
      return;
    }

    expect(drawn.rewardChoicePending).toBe(true);
    expect(state.rewardChoice).not.toBeNull();
    expect(hasActiveSubChoice(state)).toBe(true);

    // currentTurnPlayerId stays `b` (finishTurnPhases paused before advanceTurn),
    // and the eliminator `a` is a different player again — neither has any legal
    // ordinary TurnAction while the reward is unresolved. `listLegalActions` had no
    // gate at all before this task; both must now come back empty.
    expect(listLegalActions(state, b.id)).toEqual([]);
    expect(listLegalActions(state, a.id)).toEqual([]);

    b.points = 100;
    b.hand = [{ instanceId: 'other', cardId: 'basic-attack', isUpgraded: false }];
    const rejected = performTurnAction(state, b.id, { type: 'draw' });

    expect(rejected.ok).toBe(false);
  });
});
