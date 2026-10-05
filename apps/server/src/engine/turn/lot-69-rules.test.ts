/**
 * Lot 69 designer rule feedback — acceptance tests.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import {
  listAvailableRewardCards,
  orderEliminators,
  processEliminations,
  recordEliminationContributor,
} from './elimination-rewards';
import { completeEliminationRewardChoice, performTurnAction } from './perform-action';
import { createRng } from '../rng';
import { countActiveSlots } from '../specials/active-slots';

describe('Lot 69 — Imposition during Block', () => {
  it('skips Imposition while Block extra turns are active', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-imp-block',
    });
    const a = state.players.find((p) => p.id === 'a');
    const b = state.players.find((p) => p.id === 'b');
    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'imp', cardId: 'imposition', counter: 2 }),
    ];
    b.points = 10;
    b.blockAttacksForbidden = true;
    b.blockTurnsRemaining = 2;

    applyPersistentEffects(state, b.id);

    expect(b.points).toBe(10);
    expect(a.points).toBe(0);
  });
});

describe('Lot 69 — Shield refill', () => {
  it('Shield+ onto a basic shield sets 7 upgraded points', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-shield-up',
    });
    const a = state.players.find((p) => p.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    state.currentTurnPlayerId = a.id;
    a.shield = 2;
    a.shieldIsUpgraded = false;
    a.points = 20;
    a.hand = [{ instanceId: 'sh-up', cardId: 'shield', isUpgraded: true }];

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'sh-up' }).ok,
    ).toBe(true);
    expect(a.shield).toBe(7);
    expect(a.shieldIsUpgraded).toBe(true);
  });
});

describe('Lot 69 — Card Absorber pool', () => {
  it('does not push card-absorber to the pool after use', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-absorber',
    });
    const a = state.players.find((p) => p.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    state.currentTurnPlayerId = a.id;
    a.points = 20;
    state.pool = [{ instanceId: 'pool-0', cardId: 'tax', isUpgraded: false }];
    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }).ok,
    ).toBe(true);
    expect(state.pool).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'card-absorber')).toBe(false);
  });
});

describe('Lot 69 — elimination rewards', () => {
  it('orders every contributor for rewards', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l69-rewards',
    });
    const a = state.players.find((p) => p.id === 'a');
    const b = state.players.find((p) => p.id === 'b');
    const c = state.players.find((p) => p.id === 'c');
    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing seats');
    }

    a.lives = 3;
    b.lives = 5;
    c.lives = 5;
    recordEliminationContributor(state, 'victim', a.id, 2);
    recordEliminationContributor(state, 'victim', b.id, 1);

    const ordered = orderEliminators([a.id, b.id], state, createRng('l69-order'));
    expect(ordered).toEqual([a.id, b.id]);
  });
});

describe('Lot 69 — shared-kill rewards', () => {
  it('keeps victim cards until every contributor has picked', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'v', nickname: 'V' },
      ],
      seed: 'l69-shared-reward',
    });
    const a = state.players.find((p) => p.id === 'a');
    const b = state.players.find((p) => p.id === 'b');
    const v = state.players.find((p) => p.id === 'v');
    if (a === undefined || b === undefined || v === undefined) {
      throw new Error('missing seats');
    }

    v.lives = 0;
    v.hand = [{ instanceId: 'card-1', cardId: 'tax', isUpgraded: false }];
    v.specialCards = [];
    recordEliminationContributor(state, v.id, a.id, 2);
    recordEliminationContributor(state, v.id, b.id, 1);
    a.lives = 5;
    b.lives = 5;

    processEliminations(state, createRng('l69-shared-reward'), Date.now());

    expect(state.rewardQueue).toHaveLength(2);
    expect(listAvailableRewardCards(state, v.id)).toHaveLength(1);

    const firstJob = state.rewardQueue[0];
    if (firstJob === undefined || state.rewardChoice === null) {
      throw new Error('missing reward job');
    }

    const first = completeEliminationRewardChoice(
      state,
      firstJob.eliminatorPlayerId,
      firstJob.eliminationId,
      [{ type: 'points' }, { type: 'points' }],
    );
    expect(first.ok).toBe(true);
    expect(listAvailableRewardCards(state, v.id)).toHaveLength(1);
    expect(state.pool.some((card) => card.instanceId === 'card-1')).toBe(false);

    expect(state.rewardChoice).not.toBeNull();
    const secondJob = state.rewardChoice;

    const second = completeEliminationRewardChoice(
      state,
      secondJob.eliminatorPlayerId,
      secondJob.eliminationId,
      [{ type: 'card', instanceId: 'card-1' }, { type: 'lives' }],
    );
    expect(second.ok).toBe(true);
    const cardHolder = state.players.find((p) =>
      p.hand.some((card) => card.instanceId === 'card-1'),
    );
    expect(cardHolder?.id).toBe(secondJob.eliminatorPlayerId);
  });
});

describe('Lot 69 — active slot cap', () => {
  it('opens slot-drop when a fifth active card is played', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-slot-drop',
    });
    const a = state.players.find((p) => p.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    state.currentTurnPlayerId = a.id;
    state.turnSequence = 10;
    a.shield = 4;
    a.shieldIsUpgraded = false;
    a.shieldSlotQueuedAt = 1;
    a.activePersistentEffects = [
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3, slotQueuedAt: 2 }),
      makeCounterEffect({ id: 'p2', cardId: 'imposition', counter: 2, slotQueuedAt: 3 }),
      makeCounterEffect({ id: 'p3', cardId: 'points-generator', counter: 3, slotQueuedAt: 4 }),
    ];
    a.points = 20;
    a.hand = [{ instanceId: 'rou-1', cardId: 'roulette', isUpgraded: false }];

    const play = performTurnAction(state, a.id, { type: 'playCard', instanceId: 'rou-1' });
    expect(play.ok).toBe(true);

    if (!play.ok) {
      return;
    }

    expect(play.subChoicePending).toBe(true);
    expect(state.subChoice?.kind).toBe('slot-drop');
    if (state.subChoice?.kind !== 'slot-drop') {
      throw new Error('expected slot-drop');
    }

    expect(state.subChoice.playerId).toBe(a.id);
    expect(state.subChoice.slotOwnerId).toBe(a.id);
    expect(state.subChoice.eligibleSlots).toHaveLength(4);
    expect(state.subChoice.pendingActivation.kind).toBe('persistent');
    if (state.subChoice.pendingActivation.kind === 'persistent') {
      expect(state.subChoice.pendingActivation.cardId).toBe('roulette');
    }
  });

  it('lets the Curse caster pick the victim slot to drop at four actives', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-curse-cap',
    });
    const a = state.players.find((p) => p.id === 'a');
    const b = state.players.find((p) => p.id === 'b');
    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    state.currentTurnPlayerId = a.id;
    state.turnSequence = 10;
    b.shield = 4;
    b.shieldIsUpgraded = false;
    b.shieldSlotQueuedAt = 1;
    b.activePersistentEffects = [
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3, slotQueuedAt: 2 }),
      makeCounterEffect({ id: 'p2', cardId: 'imposition', counter: 2, slotQueuedAt: 3 }),
      makeCounterEffect({ id: 'p3', cardId: 'points-generator', counter: 3, slotQueuedAt: 4 }),
    ];
    a.points = 20;
    a.specialCards = [{ instanceId: 'curse-1', cardId: 'curse', isUpgraded: false }];

    const play = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'curse-1',
      targetPlayerId: b.id,
    });
    expect(play.ok).toBe(true);

    if (!play.ok) {
      return;
    }

    expect(play.subChoicePending).toBe(true);
    expect(state.subChoice?.kind).toBe('slot-drop');
    if (state.subChoice?.kind !== 'slot-drop') {
      throw new Error('expected slot-drop');
    }

    expect(state.subChoice.playerId).toBe(a.id);
    expect(state.subChoice.slotOwnerId).toBe(b.id);
    expect(state.subChoice.eligibleSlots).toHaveLength(4);
  });

  it('never offers Curse in forced slot-drop picks', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-curse-not-droppable',
    });
    const a = state.players.find((p) => p.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    state.currentTurnPlayerId = a.id;
    state.turnSequence = 10;
    a.shield = 4;
    a.shieldIsUpgraded = false;
    a.shieldSlotQueuedAt = 1;
    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-on-me',
        cardId: 'curse',
        counter: null,
        slotQueuedAt: 2,
        targetPlayerId: a.id,
      }),
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3, slotQueuedAt: 3 }),
      makeCounterEffect({ id: 'p2', cardId: 'imposition', counter: 2, slotQueuedAt: 4 }),
      makeCounterEffect({ id: 'p3', cardId: 'points-generator', counter: 3, slotQueuedAt: 5 }),
    ];
    a.points = 20;
    a.hand = [{ instanceId: 'rou-1', cardId: 'roulette', isUpgraded: false }];

    const play = performTurnAction(state, a.id, { type: 'playCard', instanceId: 'rou-1' });
    expect(play.ok).toBe(true);

    if (!play.ok) {
      return;
    }

    expect(state.subChoice?.kind).toBe('slot-drop');
    if (state.subChoice?.kind !== 'slot-drop') {
      throw new Error('expected slot-drop');
    }

    expect(state.subChoice.eligibleSlots.some((slot) => slot.cardId === 'curse')).toBe(false);
    expect(state.subChoice.eligibleSlots.length).toBeGreaterThan(0);
    expect(state.subChoice.eligibleSlots.some((slot) => slot.kind === 'shield')).toBe(true);
  });

  it('counts shield and persistents toward four slots', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'l69-slots',
    });
    const a = state.players.find((p) => p.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    a.shield = 4;
    a.activePersistentEffects = [
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3 }),
      makeCounterEffect({ id: 'p2', cardId: 'imposition', counter: 2 }),
      makeCounterEffect({ id: 'p3', cardId: 'points-generator', counter: 3 }),
    ];

    expect(countActiveSlots(state, a.id)).toBe(4);
  });
});
