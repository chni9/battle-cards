/**
 * Elimination rewards — rules spec §6, backlog L6-01…L6-05.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import {
  applyDefaultEliminationRewards,
  applyEliminationRewardChoices,
  selectEliminator,
} from './elimination-rewards';
import {
  completeEliminationRewardChoice,
  performTurnAction,
} from './perform-action';

describe('Elimination rewards (Lot 6)', () => {
  it('L6-01: eliminator applies lives + card transfer; remainder goes to pool', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-01-rewards',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 10;
    a.points = 0;
    a.hand = [];
    a.specialCards = [];
    a.pendingEffects = [];
    b.lives = 1;
    b.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    b.specialCards = [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: false }];
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = b.id;
    const turn = performTurnAction(state, b.id, { type: 'draw' });

    expect(turn.ok).toBe(true);

    if (!turn.ok) {
      return;
    }

    expect(b.isEliminated).toBe(true);
    expect(turn.rewardChoicePending).toBe(true);
    expect(turn.eliminations[0]?.eliminatorPlayerId).toBe(a.id);
    expect(state.rewardChoice).not.toBeNull();
    expect(b.hand).toHaveLength(2);
    expect(b.specialCards).toHaveLength(1);
    expect(b.eliminationSnapshot).not.toBeNull();
    expect(b.eliminationSnapshot?.kitId).toBe(b.kitId);
    expect(b.eliminationSnapshot?.points).toBe(b.points);
    expect(b.eliminationSnapshot?.hand.map((card) => card.instanceId).toSorted()).toEqual([
      'atk-1',
      'spy-1',
    ]);
    expect(b.eliminationSnapshot?.specialCards.map((card) => card.instanceId)).toEqual([
      'su-1',
    ]);

    const eliminationId = state.rewardChoice?.eliminationId;

    if (eliminationId === undefined) {
      return;
    }

    const applied = completeEliminationRewardChoice(state, a.id, eliminationId, [
      { type: 'lives' },
      { type: 'card', instanceId: 'spy-1' },
    ]);

    expect(applied.ok).toBe(true);
    expect(a.lives).toBe(14);
    expect(a.hand.some((card) => card.instanceId === 'spy-1')).toBe(true);
    expect(state.pool.some((card) => card.instanceId === 'atk-1')).toBe(true);
    expect(state.pool.some((card) => card.instanceId === 'su-1')).toBe(true);
    expect(state.rewardChoice).toBeNull();
    expect(applied.ok && applied.winnerPlayerId).toBe(a.id);
  });

  it('L6-01: life reward respects the lifeLimit cap', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-01-cap',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 23;
    a.pendingEffects = [];
    b.lives = 1;
    b.hand = [];
    b.specialCards = [];
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    const eliminationId = state.rewardChoice?.eliminationId;

    if (eliminationId === undefined) {
      return;
    }

    expect(
      applyEliminationRewardChoices(state, a.id, eliminationId, [
        { type: 'lives' },
        { type: 'lives' },
      ]).ok,
    ).toBe(true);
    expect(a.lives).toBe(state.lifeLimit);
  });

  it('L6-02: multiple reward jobs chain without advancing mid-queue', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l6-02-chain',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    for (const player of state.players) {
      player.pendingEffects = [];
      player.hand = [];
      player.specialCards = [];
    }

    // Force two elims in one processEliminations by zeroing both before mark via
    // contributor log + lives — use performTurnAction only for one victim, then
    // inject a second ready-to-mark player is impossible mid-turn. Instead enqueue
    // two jobs directly after one real elim pause, simulating N-queue.
    a.lives = 10;
    b.lives = 1;
    b.pendingEffects = [
      {
        id: 'hit-b',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(state.rewardQueue).toHaveLength(1);

    // Second elim job (as if another player died same step).
    c.lives = 0;
    c.isEliminated = true;
    state.rewardQueue.push({
      eliminationId: 'job-2',
      eliminatedPlayerId: c.id,
      eliminatorPlayerId: a.id,
    });

    const firstId = state.rewardChoice?.eliminationId;

    if (firstId === undefined) {
      return;
    }

    const first = completeEliminationRewardChoice(state, a.id, firstId, [
      { type: 'points' },
      { type: 'points' },
    ]);

    expect(first.ok).toBe(true);
    expect(first.ok && first.rewardChoicePending).toBe(true);
    expect(state.rewardChoice?.eliminationId).toBe('job-2');
    expect(state.currentTurnPlayerId).toBe(b.id);

    const second = completeEliminationRewardChoice(state, a.id, 'job-2', [
      { type: 'upgradePoint' },
      { type: 'upgradePoint' },
    ]);

    expect(second.ok).toBe(true);
    expect(second.ok && second.rewardChoicePending).toBe(false);
    expect(a.points).toBeGreaterThanOrEqual(16);
    expect(a.upgradePoints).toBeGreaterThanOrEqual(2);
  });

  it('L6-03: default expiry grants 2×4 lives', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-03-default',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 5;
    a.pendingEffects = [];
    b.lives = 1;
    b.hand = [{ instanceId: 'x', cardId: 'tax', isUpgraded: false }];
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    const before = a.lives;
    const result = applyDefaultEliminationRewards(state);

    expect(result.ok).toBe(true);
    expect(a.lives).toBe(before + 8);
    expect(state.pool.some((card) => card.instanceId === 'x')).toBe(true);
    expect(state.rewardChoice).toBeNull();
  });

  it('L6-04: Tax self-elim pools cards with no reward', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-04-tax',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 1;
    a.hand = [
      { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    a.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    const result = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(a.isEliminated).toBe(true);
    expect(result.rewardChoicePending).toBeUndefined();
    expect(result.eliminations[0]?.eliminatorPlayerId).toBeNull();
    expect(state.rewardChoice).toBeNull();
    expect(state.pool.some((card) => card.instanceId === 'spy-1')).toBe(true);
    expect(result.winnerPlayerId).toBe(b.id);
  });

  it('L6-04: self-Sentence pools cards with no reward', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-04-sentence',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 5;
    a.hand = [{ instanceId: 'keep', cardId: 'shield', isUpgraded: false }];
    a.pendingEffects = [
      {
        id: 'sent-1',
        cardId: 'sentence',
        sourcePlayerId: a.id,
        targetPlayerId: a.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = a.id;
    const result = performTurnAction(state, a.id, { type: 'draw' });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(a.isEliminated).toBe(true);
    expect(result.eliminations[0]?.eliminatorPlayerId).toBeNull();
    expect(state.rewardChoice).toBeNull();
    expect(state.pool.some((card) => card.instanceId === 'keep')).toBe(true);
    expect(result.winnerPlayerId).toBe(b.id);
  });

  it('L6-05: fewest lives wins among simultaneous eliminators', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l6-05-lives',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    a.lives = 3;
    a.points = 100;
    b.lives = 8;
    b.points = 0;
    c.lives = 5;

    expect(selectEliminator([a.id, b.id], state, createRng('x'))).toBe(a.id);
  });

  it('L6-05: equal lives → fewest points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-05-points',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 4;
    a.points = 10;
    b.lives = 4;
    b.points = 2;

    expect(selectEliminator([a.id, b.id], state, createRng('x'))).toBe(b.id);
  });

  it('L6-05: equal lives and points → seeded random is reproducible', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-05-rng',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.lives = 4;
    a.points = 5;
    b.lives = 4;
    b.points = 5;

    const first = selectEliminator([a.id, b.id], state, createRng('tie-seed'));
    const second = selectEliminator([a.id, b.id], state, createRng('tie-seed'));

    expect(first).toBe(second);
    expect(first === a.id || first === b.id).toBe(true);
  });

  it('rejects an impossible card reward pick', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l6-reject-card',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.pendingEffects = [];
    b.lives = 1;
    b.hand = [];
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
      },
    ];

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    const eliminationId = state.rewardChoice?.eliminationId;

    if (eliminationId === undefined) {
      return;
    }

    const rejected = applyEliminationRewardChoices(state, a.id, eliminationId, [
      { type: 'card', instanceId: 'missing' },
      { type: 'lives' },
    ]);

    expect(rejected.ok).toBe(false);
    expect(state.rewardChoice).not.toBeNull();
  });
});
