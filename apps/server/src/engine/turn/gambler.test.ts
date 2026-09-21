/**
 * Gambler starting loadout + Draw bust — rules spec §4, designer 2026-09-21 / L64-02 / L63-02.
 */

import { getKit, randomStartingSpecialPool } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCounterEffect, scriptedRng } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { dealStartingLoadout } from '../reanimate-player';
import { applyPersistentEffects } from './apply-persistent-effects';
import { beginTurnFor } from './advance-turn';
import { performTurnAction } from './perform-action';
import { rollDrawGain } from './sample-draw-gain';

describe('Gambler kit (L64-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches catalog resources, zero hand cards, Roulette plus two distinct randoms', () => {
    const kit = getKit('gambler');
    expect(kit.startingResources).toEqual({
      lives: 1,
      points: 0,
      upgradePoints: 0,
      draw: 10,
    });
    expect(kit.startingCardCounts).toEqual({ action: 0, attack: 0 });
    expect(kit.specialCards).toEqual(['roulette']);
    expect(kit.randomStartingSpecialCount).toBe(2);
    expect(kit.traits.drawBustDenominator).toBe(10);
    expect(randomStartingSpecialPool(kit)).not.toContain('roulette');

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
    expect(player.specialCards).toHaveLength(3);
    const randomIds = player.specialCards.slice(0, 2).map((card) => card.cardId);
    expect(randomIds).not.toContain('roulette');
    expect(new Set(randomIds).size).toBe(2);
    expect(player.specialCards[2]?.cardId).toBe('roulette');
  });

  it('reproduces the same two distinct randoms for the same seed and never rolls Roulette there', () => {
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
    expect(dealtIds).toHaveLength(3);
    expect(dealtIds.slice(0, 2)).not.toContain('roulette');
    expect(new Set(dealtIds.slice(0, 2)).size).toBe(2);
    expect(dealtIds[2]).toBe('roulette');
    expect(dealtIds.filter((id) => id === 'roulette')).toHaveLength(1);

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
    expect(player.specialCards).toHaveLength(3);
    const forcedRandom = player.specialCards.slice(0, 2).map((card) => card.cardId);
    expect(forcedRandom).not.toContain('roulette');
    expect(new Set(forcedRandom).size).toBe(2);
    expect(player.specialCards[2]?.cardId).toBe('roulette');
  });

  it('keeps Prophet random specials with replacement', () => {
    const kit = getKit('prophet');
    expect(kit.randomStartingSpecialCount).toBe(2);
    expect(kit.specialCards).toEqual([]);
  });
});

describe('Gambler Draw gain (L64-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('rolls first-seat Gambler Draw at create without consuming the deal RNG', () => {
    const state = createInitialState({
      seats,
      seed: 'l64-03-first-seat',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const first = state.players[0];
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }

    if (first.kitId === 'gambler') {
      expect(first.drawGain).toBeGreaterThanOrEqual(5);
      expect(first.drawGain).toBeLessThanOrEqual(100);
    } else {
      expect(first.drawGain).toBeUndefined();
    }

    const again = createInitialState({
      seats,
      seed: 'l64-03-first-seat',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    expect(again.players[0]?.specialCards.map((card) => card.cardId)).toEqual(
      state.players[0]?.specialCards.map((card) => card.cardId),
    );
    expect(again.players[0]?.drawGain).toBe(first.drawGain);
  });

  it('rerolls Draw on beginTurnFor for a Gambler and leaves other kits unset', () => {
    const state = createInitialState({
      seats,
      seed: 'l64-03-begin-turn',
      kitAssignment: ['kamikaze', 'gambler'],
    });
    const gambler = state.players.find((player) => player.kitId === 'gambler');
    const other = state.players.find((player) => player.kitId === 'kamikaze');
    expect(gambler).toBeDefined();
    expect(other).toBeDefined();
    if (gambler === undefined || other === undefined) {
      return;
    }

    state.turnSequence = 4;
    beginTurnFor(state, gambler);
    expect(gambler.drawGain).toBeGreaterThanOrEqual(5);
    expect(gambler.drawGain).toBeLessThanOrEqual(100);

    const firstRoll = gambler.drawGain;
    state.turnSequence = 5;
    beginTurnFor(state, gambler);
    expect(gambler.drawGain).not.toBe(firstRoll);

    beginTurnFor(state, other);
    expect(other.drawGain).toBeUndefined();
    expect('drawGain' in other).toBe(false);
  });

  it('reproduces the same Draw roll from seed, seat, and turnSequence', () => {
    const state = createInitialState({
      seats,
      seed: 'l64-03-repro',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    state.turnSequence = 9;
    rollDrawGain(state, actor);
    const first = actor.drawGain;
    rollDrawGain(state, actor);
    expect(actor.drawGain).toBe(first);
  });
});

describe('Gambler Draw bust (L63-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('safe Draw grants the rolled payout and leaves lives intact', () => {
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
    actor.drawGain = 47;

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([1]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('draw');
    expect(result.actionPlayed.drawBust).toBeUndefined();
    expect(result.actionPlayed.drawGain).toBe(47);
    expect(actor.lives).toBe(14);
    expect(actor.points).toBe(47);
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
    expect(result.actionPlayed.drawGain).toBeUndefined();
    expect(actor.lives).toBe(0);
    expect(actor.points).toBe(0);
    expect(actor.isEliminated).toBe(true);
    expect(result.eliminatedPlayerIds).toEqual([actor.id]);
    expect(result.eliminations).toEqual([
      { playerId: actor.id, eliminatorPlayerId: null, reason: 'gambling' },
    ]);
    expect(result.winnerPlayerId).toBe(other.id);
  });

  it('unplayed Reanimation in the random two cannot save a first-turn bust', () => {
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
