/**
 * Assassin multi-attack candidate generator — technical spec v3 §4.3 (L16-02).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  ASSASSIN_CANDIDATE_CAP,
  listAssassinMultiAttackCandidates,
} from './assassin-candidates';
import { listLegalActions } from './list-legal-actions';
import { performTurnAction } from './perform-action';

describe('listAssassinMultiAttackCandidates (L16-02)', () => {
  it('returns none for a non-Assassin kit', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'assassin-cand-non',
    });
    const actor = state.players[0];

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'kamikaze';
    actor.points = 50;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'strong-attack', isUpgraded: false },
    ];

    expect(listAssassinMultiAttackCandidates(state, actor)).toEqual([]);
  });

  it('caps candidates at 8 and every candidate is accepted', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
        { id: 'd', nickname: 'Dan' },
      ],
      seed: 'assassin-cand-cap',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'assassin';
    actor.points = 100;
    actor.hand = [
      { instanceId: 'a1', cardId: 'super-attack', isUpgraded: true },
      { instanceId: 'a2', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'a3', cardId: 'strong-attack', isUpgraded: true },
      { instanceId: 'a4', cardId: 'basic-attack', isUpgraded: false },
    ];

    const candidates = listAssassinMultiAttackCandidates(state, actor);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(ASSASSIN_CANDIDATE_CAP);

    for (const action of candidates) {
      const clone = structuredClone(state);
      clone.currentTurnPlayerId = actor.id;
      const result = performTurnAction(clone, actor.id, action);
      expect(result.ok, JSON.stringify(action)).toBe(true);
    }
  });

  it('excludes unaffordable multi-attack sums', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'assassin-cand-broke',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'assassin';
    actor.points = 2; // basic(1)+strong(2)=3 unaffordable; two basics would be 2
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'strong-attack', isUpgraded: false },
    ];

    const candidates = listAssassinMultiAttackCandidates(state, actor);
    expect(candidates).toEqual([]);
  });

  it('wires into listLegalActions and stays within §10.2', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'assassin-cand-wired',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'assassin';
    actor.points = 30;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a3', cardId: 'strong-attack', isUpgraded: false },
    ];

    const actions = listLegalActions(state, actor.id);
    const multi = actions.filter((action) => action.type === 'playMultipleAttacks');
    expect(multi.length).toBeGreaterThan(0);
    expect(multi.length).toBeLessThanOrEqual(ASSASSIN_CANDIDATE_CAP);

    for (const action of actions) {
      const clone = structuredClone(state);
      clone.currentTurnPlayerId = actor.id;
      clone.mirrorChoice = null;
      clone.rewardChoice = null;
      clone.rewardQueue = [];
      expect(performTurnAction(clone, actor.id, action).ok).toBe(true);
    }
  });
});
