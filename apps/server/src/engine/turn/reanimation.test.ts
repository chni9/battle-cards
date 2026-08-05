/**
 * Reanimation — rules spec §5, technical spec v4 §10.3 / §11.7, backlog L26-01.
 *
 * #V4-11: elimination happens; eliminator is paid; victim returns stripped.
 * Revive after rewards with full step 2+3+4 (#V4-36).
 */

import { getKit, KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import {
  applyDefaultEliminationRewards,
  eliminateWithoutReward,
  findSoleSurvivorId,
} from './elimination-rewards';
import { performTurnAction } from './perform-action';

describe('Reanimation base (L26-01 / §10.3)', () => {
  it('arms on play and rejects a second armed play (#V4-12c)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-01-arm',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.specialCards = [
      { instanceId: 're-1', cardId: 'reanimation', isUpgraded: false },
      { instanceId: 're-2', cardId: 'reanimation', isUpgraded: false },
    ];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    const first = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 're-1',
    });
    expect(first.ok).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'reanimation')).toBe(
      true,
    );

    // Advance so A can act again.
    state.currentTurnPlayerId = a.id;
    const second = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 're-2',
    });
    expect(second.ok).toBe(false);
    expect(a.specialCards.some((card) => card.instanceId === 're-2')).toBe(true);
  });

  it('pays the eliminator then revives with full kit loadout after rewards (#V4-11 / #V4-36)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-01-combat-revive',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    a.points = 0;
    a.hand = [];
    a.specialCards = [];
    b.lives = 1;
    b.kitId = 'kamikaze';
    b.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    b.specialCards = [];
    b.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];
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
    const turn = performTurnAction(state, b.id, { type: 'draw' });
    expect(turn.ok).toBe(true);

    if (!turn.ok) {
      return;
    }

    expect(b.isEliminated).toBe(true);
    expect(b.pendingReanimation).toEqual({ isUpgraded: false });
    expect(turn.rewardChoicePending).toBe(true);
    expect(findSoleSurvivorId(state)).toBeNull();
    expect(state.pool.some((card) => card.cardId === 'reanimation')).toBe(true);

    const settled = applyDefaultEliminationRewards(state);
    expect(settled.ok).toBe(true);
    expect(a.lives).toBe(18);
    expect(b.isEliminated).toBe(false);
    expect(b.pendingReanimation).toBeNull();
    expect(b.eliminationSnapshot).toBeNull();
    expect((KIT_IDS as readonly string[]).includes(b.kitId)).toBe(true);

    const kit = getKit(b.kitId);
    expect(b.lives).toBe(kit.startingResources.lives);
    expect(b.points).toBe(kit.startingResources.points);
    expect(b.upgradePoints).toBe(kit.startingResources.upgradePoints);
    expect(b.hand.length).toBe(
      kit.startingCardCounts.action + kit.startingCardCounts.attack,
    );
    expect(b.specialCards.length).toBe(kit.specialCards.length);
    expect(b.hand.some((card) => card.instanceId === 'atk-1')).toBe(false);
    expect(state.pool.some((card) => card.instanceId === 'atk-1')).toBe(true);
  });

  it('revives on lifecycle elimination with no rewards (#V4-12a)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-01-lifecycle',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];
    a.hand = [{ instanceId: 'keep-me', cardId: 'tax', isUpgraded: false }];

    expect(eliminateWithoutReward(state, a.id, createRng('l26-01-lifecycle-rng'))).toBe(
      true,
    );
    expect(a.isEliminated).toBe(false);
    expect(a.pendingReanimation).toBeNull();
    expect(state.pool.some((card) => card.instanceId === 'keep-me')).toBe(true);
    expect(findSoleSurvivorId(state)).toBeNull();
  });

  it('does not end the game while pending reanimation holds a seat', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-01-no-gameover',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.isEliminated = true;
    a.lives = 0;
    a.pendingReanimation = { isUpgraded: false };
    b.isEliminated = false;

    expect(findSoleSurvivorId(state)).toBeNull();
  });

  it('captures a fresh eliminationSnapshot on a second death (§10.3)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l26-01-second-death',
      kitAssignment: ['assassin', 'kamikaze', 'scientific'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    b.lives = 1;
    b.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];
    b.hand = [{ instanceId: 'old-1', cardId: 'tax', isUpgraded: false }];
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
    const first = performTurnAction(state, b.id, { type: 'draw' });
    expect(first.ok).toBe(true);
    expect(applyDefaultEliminationRewards(state).ok).toBe(true);
    expect(b.isEliminated).toBe(false);
    expect(b.eliminationSnapshot).toBeNull();

    const kitAfterRevive = b.kitId;
    b.lives = 1;
    b.hand = [{ instanceId: 'new-1', cardId: 'spy', isUpgraded: false }];
    b.pendingEffects = [
      {
        id: 'hit-2',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: state.turnSequence,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    state.currentTurnPlayerId = b.id;
    const second = performTurnAction(state, b.id, { type: 'draw' });
    expect(second.ok).toBe(true);
    expect(b.isEliminated).toBe(true);
    expect(b.eliminationSnapshot).not.toBeNull();
    expect(b.eliminationSnapshot?.kitId).toBe(kitAfterRevive);
    expect(b.eliminationSnapshot?.hand.map((card) => card.instanceId)).toEqual(['new-1']);
  });

  it('re-enters turn order after revive', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-01-turn-order',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.lives = 1;
    b.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];
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
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(applyDefaultEliminationRewards(state).ok).toBe(true);
    expect(b.isEliminated).toBe(false);

    // After rewards, advanceTurn ran; both seats remain contenders.
    expect(findSoleSurvivorId(state)).toBeNull();
    expect(state.players.filter((player) => !player.isEliminated)).toHaveLength(2);
  });

  it('records playerReanimated when base reanimation completes after rewards (L30-06)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l30-06-base-reanim-log',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.lives = 1;
    b.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];
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
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    const rewardResult = applyDefaultEliminationRewards(state);
    expect(rewardResult.ok).toBe(true);

    if (!rewardResult.ok) {
      return;
    }

    expect(rewardResult.playerReanimated).toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: b.id })]),
    );
  });
});
