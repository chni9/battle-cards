/**
 * Gambler starting loadout + Draw bust — rules spec §4, designer 2026-09-20 / L63-01 / L63-02.
 */

import { getKit, randomStartingSpecialPool } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCounterEffect, scriptedRng } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { dealStartingLoadout } from '../reanimate-player';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Gambler kit (L63-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches catalog resources, zero hand cards, Factory plus five randoms', () => {
    const kit = getKit('gambler');
    expect(kit.startingResources).toEqual({
      lives: 1,
      points: 0,
      upgradePoints: 0,
      draw: 10,
    });
    expect(kit.startingCardCounts).toEqual({ action: 0, attack: 0 });
    expect(kit.specialCards).toEqual(['factory']);
    expect(kit.randomStartingSpecialCount).toBe(5);
    expect(kit.traits.drawBustDenominator).toBe(10);
    expect(randomStartingSpecialPool(kit)).not.toContain('factory');

    const state = createInitialState({
      seats,
      seed: 'gambler-catalog',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'gambler');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(1);
    expect(player.points).toBe(0);
    expect(player.upgradePoints).toBe(0);
    expect(player.hand).toEqual([]);
    expect(player.specialCards).toHaveLength(6);
    const randomIds = player.specialCards.slice(0, 5).map((card) => card.cardId);
    expect(randomIds).not.toContain('factory');
    expect(player.specialCards[5]?.cardId).toBe('factory');
  });

  it('reproduces the same five randoms for the same seed and never rolls Factory there', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-rng-pool',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'gambler');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    const dealtIds = player.specialCards.map((card) => card.cardId);
    expect(dealtIds).toHaveLength(6);
    expect(dealtIds.slice(0, 5)).not.toContain('factory');
    expect(dealtIds[5]).toBe('factory');

    const again = createInitialState({
      seats,
      seed: 'gambler-rng-pool',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const againPlayer = again.players.find((p) => p.kitId === 'gambler');
    expect(againPlayer?.specialCards.map((card) => card.cardId)).toEqual(dealtIds);

    player.hand = [];
    player.specialCards = [];
    dealStartingLoadout(player, 'gambler', createRng('gambler-forced'), 'forced');
    expect(player.specialCards).toHaveLength(6);
    expect(player.specialCards.slice(0, 5).map((card) => card.cardId)).not.toContain(
      'factory',
    );
    expect(player.specialCards[5]?.cardId).toBe('factory');
  });
});

describe('Gambler Draw bust (L63-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('safe Draw grants 10 points and leaves lives intact', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-draw-safe',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 14;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.activePersistentEffects = [];

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([1]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('draw');
    expect(result.actionPlayed.drawBust).toBeUndefined();
    expect(actor.lives).toBe(14);
    expect(actor.points).toBe(10);
    expect(actor.isEliminated).toBe(false);
    expect(result.eliminatedPlayerIds).toEqual([]);
  });

  it('forced bust zeros lives at any total, grants no points, and has no eliminator', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-draw-bust',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    const other = state.players.find((player) => player.kitId === 'kamikaze');
    expect(actor).toBeDefined();
    expect(other).toBeDefined();
    if (actor === undefined || other === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 14;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.activePersistentEffects = [];
    actor.hand = [];
    actor.specialCards = [];

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([0]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('draw');
    expect(result.actionPlayed.drawBust).toBe(true);
    expect(actor.lives).toBe(0);
    expect(actor.points).toBe(0);
    expect(actor.isEliminated).toBe(true);
    expect(result.eliminatedPlayerIds).toEqual([actor.id]);
    expect(result.eliminations).toEqual([{ playerId: actor.id, eliminatorPlayerId: null }]);
    expect(result.winnerPlayerId).toBe(other.id);
  });

  it('unplayed Reanimation in the random five cannot save a first-turn bust', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-bust-unplayed-reanim',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 1;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.activePersistentEffects = [];
    actor.hand = [];
    actor.specialCards = [
      { instanceId: 're-1', cardId: 'reanimation', isUpgraded: false },
    ];

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([0]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(actor.isEliminated).toBe(true);
    expect(actor.pendingReanimation).toBeNull();
    expect(result.actionPlayed.drawBust).toBe(true);
  });

  it('armed Reanimation on a later bust follows the normal revive path', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-bust-armed-reanim',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 14;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.hand = [];
    actor.specialCards = [];
    actor.activePersistentEffects = [
      {
        id: 'reanim-armed',
        cardId: 'reanimation',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];

    const result = performTurnAction(
      state,
      actor.id,
      { type: 'draw' },
      scriptedRng([0], createRng('gambler-bust-armed-reanim-deal')),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.drawBust).toBe(true);
    expect(result.eliminatedPlayerIds).toEqual([actor.id]);
    expect(actor.isEliminated).toBe(false);
    expect(actor.pendingReanimation).toBeNull();
    expect(actor.lives).toBeGreaterThan(0);
    expect(result.winnerPlayerId).toBeNull();
  });

  it('Invisibility ticks do not roll Draw bust', () => {
    const state = createInitialState({
      seats,
      seed: 'gambler-invis-no-bust',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    if (actor === undefined) {
      return;
    }

    actor.lives = 14;
    actor.points = 0;
    actor.activePersistentEffects = [
      makeCounterEffect({
        id: 'inv-1',
        cardId: 'invisibility',
        counter: 4,
        isUpgraded: false,
      }),
    ];

    applyPersistentEffects(state, actor.id);
    expect(actor.lives).toBe(14);
    expect(actor.points).toBe(4);
    expect(actor.isEliminated).toBe(false);
  });

  it('Tactician Draw is unchanged even when the injected rng would bust', () => {
    const state = createInitialState({
      seats,
      seed: 'tactician-no-bust',
      kitAssignment: ['tactician', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'tactician');
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 1;
    actor.points = 0;
    actor.pendingEffects = [];

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.drawBust).toBeUndefined();
    expect(actor.lives).toBe(1);
    expect(actor.points).toBe(4);
    expect(actor.isEliminated).toBe(false);
  });
});
