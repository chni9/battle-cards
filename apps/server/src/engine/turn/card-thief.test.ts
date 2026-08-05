/**
 * Card Thief — rules spec §5, backlog L21-03 / #V4-19 / #V4-34 / #V4-35 / #V4-33.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import {
  completeStealChoice,
  performTurnAction,
} from './perform-action';

describe('Card Thief (L21-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
  ] as const;

  it('base: queues a random steal; resolves by taking a card into the thief hand', () => {
    const state = createInitialState({ seats, seed: 'l21-03-base' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    b.specialCards = [];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);
    expect(state.stealChoice).toBeNull();
    expect(b.pendingEffects).toHaveLength(1);
    expect(b.pendingEffects[0]?.chosenInstanceId).toBeNull();

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.hand).toHaveLength(0);
    expect(a.hand.some((card) => card.instanceId === 'tax-1')).toBe(true);
  });

  it('empty victim: play is legal and resolves as a no-op (#V4-34)', () => {
    const state = createInitialState({ seats, seed: 'l21-03-empty' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.hand = [];
    b.specialCards = [];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);
    expect(b.pendingEffects).toHaveLength(1);

    const aHandBefore = a.hand.length;
    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(a.hand).toHaveLength(aHandBefore);
  });

  it('spied-by-user: raises steal-pick and locks chosenInstanceId (#V4-35)', () => {
    const state = createInitialState({ seats, seed: 'l21-03-spied' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.hand = [
      { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    b.specialCards = [{ instanceId: 'cl-1', cardId: 'cloning', isUpgraded: false }];
    b.pendingEffects = [];
    grantSpy(state, a.id, b.id, 'kit-and-cards');

    state.currentTurnPlayerId = a.id;
    const play = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'ct-1',
      targetPlayerId: b.id,
    });
    expect(play.ok).toBe(true);
    if (play.ok) {
      expect(play.stealChoicePending).toBe(true);
    }
    expect(state.stealChoice).not.toBeNull();
    expect(state.stealChoice?.eligibleInstanceIds).toEqual(['tax-1', 'spy-1', 'cl-1']);
    expect(b.pendingEffects).toHaveLength(0);

    expect(completeStealChoice(state, a.id, 'spy-1').ok).toBe(true);
    expect(state.stealChoice).toBeNull();
    expect(b.pendingEffects[0]?.chosenInstanceId).toBe('spy-1');

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.hand.some((card) => card.instanceId === 'spy-1')).toBe(false);
    expect(a.hand.some((card) => card.instanceId === 'spy-1')).toBe(true);
  });

  it('spied-by-other: still random, no steal-pick', () => {
    const state = createInitialState({ seats, seed: 'l21-03-third-spy' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    b.pendingEffects = [];
    grantSpy(state, c.id, b.id, 'kit-and-cards');

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);
    expect(state.stealChoice).toBeNull();
    expect(b.pendingEffects[0]?.chosenInstanceId).toBeNull();
  });

  it('upgraded: queues one effect per alive opponent', () => {
    const state = createInitialState({ seats, seed: 'l21-03-up' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: true }];
    a.points = 5;
    a.pendingEffects = [];
    b.hand = [{ instanceId: 'b-tax', cardId: 'tax', isUpgraded: false }];
    b.pendingEffects = [];
    c.hand = [{ instanceId: 'c-tax', cardId: 'tax', isUpgraded: false }];
    c.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ct-1' }).ok,
    ).toBe(true);
    expect(b.pendingEffects).toHaveLength(1);
    expect(c.pendingEffects).toHaveLength(1);
  });

  it('chosenInstanceId is omitted from PlayingStateView (privacy)', () => {
    const state = createInitialState({ seats, seed: 'l21-03-privacy' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.pendingEffects = [
      {
        id: 'fx-1',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        cardId: 'card-thief',
        isUpgraded: false,
        queuedAt: 1,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: 'secret-id',
      },
    ];

    const view = buildPlayingViewFor({
      recipientSessionId: a.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.pendingEffects[0]).toBeDefined();
    expect(view.pendingEffects[0]).not.toHaveProperty('chosenInstanceId');
  });

  it('reciprocal Card Thief does not cancel (#V4-33)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l21-03-counter',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [{ instanceId: 'ct-a', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.hand = [{ instanceId: 'a-tax', cardId: 'tax', isUpgraded: false }];
    a.pendingEffects = [];
    b.specialCards = [{ instanceId: 'ct-b', cardId: 'card-thief', isUpgraded: false }];
    b.points = 5;
    b.hand = [{ instanceId: 'b-tax', cardId: 'tax', isUpgraded: false }];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-a',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(
      performTurnAction(state, b.id, {
        type: 'playCard',
        instanceId: 'ct-b',
        targetPlayerId: a.id,
      }).ok,
    ).toBe(true);
    // a's CT resolved on b (applied, not cancelled); b's CT pending on a
    expect(b.hand.some((card) => card.instanceId === 'b-tax')).toBe(false);
    expect(a.pendingEffects.some((effect) => effect.cardId === 'card-thief')).toBe(true);
  });

  it('alwaysUpgraded applies when a Scientific steals a Spy', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l21-03-always',
      kitAssignment: ['scientific', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.kitId = 'scientific';
    a.specialCards = [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }];
    a.points = 5;
    a.hand = [];
    a.pendingEffects = [];
    b.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }, createRng('x')).ok).toBe(true);
    const stolen = a.hand.find((card) => card.instanceId === 'spy-1');
    expect(stolen?.isUpgraded).toBe(true);
  });
});
