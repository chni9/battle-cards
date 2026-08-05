/**
 * Ghost kit life-loss credit — rules spec §4, #V4-22, backlog L28-01.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { creditGhostLifeLoss } from '../kits/credit-ghost-life-loss';
import { createRng } from '../rng';
import { applyPersistentEffects } from './apply-persistent-effects';
import { eliminateWithoutReward, processEliminations } from './elimination-rewards';
import { performTurnAction } from './perform-action';
import { resolvePendingEffects } from './resolve-pending';

const testRng = createRng('ghost-test-rng');

describe('Ghost kit credit (L28-01 / #V4-22)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog resources and Curse special', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-catalog',
      kitAssignment: ['ghost', 'kamikaze'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    expect(ghost).toBeDefined();
    if (ghost === undefined) {
      return;
    }

    expect(ghost.lives).toBe(14);
    expect(ghost.points).toBe(0);
    expect(ghost.upgradePoints).toBe(0);
    expect(ghost.specialCards.map((card) => card.cardId)).toEqual(['curse']);
  });

  it('credits 2 × livesLost through a shield, not raw damage', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-shield',
      kitAssignment: ['ghost', 'assassin'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    const attacker = state.players.find((player) => player.id !== ghost?.id);

    expect(ghost).toBeDefined();
    expect(attacker).toBeDefined();
    if (ghost === undefined || attacker === undefined) {
      return;
    }

    ghost.lives = 14;
    ghost.points = 0;
    ghost.shield = 5;
    ghost.pendingEffects = [
      {
        id: 'atk',
        sourcePlayerId: attacker.id,
        targetPlayerId: ghost.id,
        cardId: 'strong-attack',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];

    resolvePendingEffects(state, ghost.id, testRng);

    // strong-attack base 5; shield absorbs all → livesLost 0
    expect(ghost.lives).toBe(14);
    expect(ghost.points).toBe(0);

    ghost.shield = 1;
    ghost.pendingEffects = [
      {
        id: 'atk2',
        sourcePlayerId: attacker.id,
        targetPlayerId: ghost.id,
        cardId: 'strong-attack',
        isUpgraded: false,
        queuedAt: 1,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    resolvePendingEffects(state, ghost.id, testRng);

    // 2 damage − 1 shield = 1 life lost → +2 points
    expect(ghost.lives).toBe(13);
    expect(ghost.points).toBe(2);
  });

  it('credits Tax life cost', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-tax',
      kitAssignment: ['ghost', 'kamikaze'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    expect(ghost).toBeDefined();
    if (ghost === undefined) {
      return;
    }

    state.currentTurnPlayerId = ghost.id;
    ghost.lives = 14;
    ghost.points = 0;
    ghost.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];

    const result = performTurnAction(state, ghost.id, {
      type: 'playCard',
      instanceId: 'tax-1',
    });
    expect(result.ok).toBe(true);
    expect(ghost.lives).toBe(13);
    // Tax +4 points and Ghost +2 for the life lost
    expect(ghost.points).toBe(6);
  });

  it('credits Imposition ceded life and Poison ticks', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-imposition-poison',
      kitAssignment: ['ghost', 'untouchable'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    const other = state.players.find((player) => player.id !== ghost?.id);
    expect(ghost).toBeDefined();
    expect(other).toBeDefined();
    if (ghost === undefined || other === undefined) {
      return;
    }

    ghost.lives = 14;
    ghost.points = 0;
    other.activePersistentEffects = [
      makeCounterEffect({
        id: 'imp',
        cardId: 'imposition',
        counter: 2,
        targetPlayerId: ghost.id,
      }),
    ];
    applyPersistentEffects(state, ghost.id);
    expect(ghost.lives).toBe(13);
    expect(ghost.points).toBe(2);

    ghost.points = 0;
    other.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];
    applyPersistentEffects(state, ghost.id);
    expect(ghost.lives).toBe(12);
    expect(ghost.points).toBe(2);
  });

  it('credits opponent Suicide via applyLifeLoss', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-suicide-opp',
      kitAssignment: ['ghost', 'kamikaze'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    const kam = state.players.find((player) => player.kitId === 'kamikaze');
    expect(ghost).toBeDefined();
    expect(kam).toBeDefined();
    if (ghost === undefined || kam === undefined) {
      return;
    }

    ghost.lives = 14;
    ghost.points = 0;
    ghost.pendingEffects = [
      {
        id: 'su',
        sourcePlayerId: kam.id,
        targetPlayerId: ghost.id,
        cardId: 'suicide',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    resolvePendingEffects(state, ghost.id, testRng);
    expect(ghost.lives).toBe(9);
    expect(ghost.points).toBe(10);
  });

  it('credits Self-Suicide and Sentence for lives before assignment', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-lethal',
      kitAssignment: ['ghost', 'assassin'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    const other = state.players.find((player) => player.id !== ghost?.id);
    expect(ghost).toBeDefined();
    expect(other).toBeDefined();
    if (ghost === undefined || other === undefined) {
      return;
    }

    ghost.lives = 7;
    ghost.points = 0;
    // queuedAt must differ from turnSequence or self-Suicide defers to a later turn.
    ghost.pendingEffects = [
      {
        id: 'self-su',
        sourcePlayerId: ghost.id,
        targetPlayerId: ghost.id,
        cardId: 'suicide',
        isUpgraded: false,
        queuedAt: state.turnSequence - 1,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    resolvePendingEffects(state, ghost.id, testRng);
    expect(ghost.lives).toBe(0);
    expect(ghost.points).toBe(14);

    ghost.lives = 5;
    ghost.points = 0;
    ghost.isEliminated = false;
    ghost.pendingEffects = [
      {
        id: 'sent',
        sourcePlayerId: other.id,
        targetPlayerId: ghost.id,
        cardId: 'sentence',
        isUpgraded: false,
        queuedAt: 1,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    resolvePendingEffects(state, ghost.id, testRng);
    expect(ghost.lives).toBe(0);
    expect(ghost.points).toBe(10);
  });

  it('does not credit Cloning resource copy', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-cloning',
      kitAssignment: ['ghost', 'scientific'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    const sci = state.players.find((player) => player.kitId === 'scientific');
    expect(ghost).toBeDefined();
    expect(sci).toBeDefined();
    if (ghost === undefined || sci === undefined) {
      return;
    }

    state.currentTurnPlayerId = ghost.id;
    ghost.lives = 14;
    ghost.points = 50;
    ghost.specialCards = [{ instanceId: 'cl-1', cardId: 'cloning', isUpgraded: false }];
    sci.lives = 4;
    sci.points = 0;
    sci.upgradePoints = 0;

    const result = performTurnAction(state, ghost.id, {
      type: 'playCard',
      instanceId: 'cl-1',
      targetPlayerId: sci.id,
    });
    expect(result.ok).toBe(true);
    expect(ghost.lives).toBe(4);
    // Points come from Cloning's snapshot of sci (0), not Ghost credit
    expect(ghost.points).toBe(0);
  });

  it('does not double-credit elimination bookkeeping after already-0', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-elim-book',
      kitAssignment: ['ghost', 'kamikaze'],
    });
    const ghost = state.players.find((player) => player.kitId === 'ghost');
    expect(ghost).toBeDefined();
    if (ghost === undefined) {
      return;
    }

    ghost.lives = 0;
    ghost.points = 20;
    processEliminations(state, testRng);
    expect(ghost.points).toBe(20);

    const state2 = createInitialState({
      seats,
      seed: 'ghost-elim-forfeit',
      kitAssignment: ['ghost', 'kamikaze'],
    });
    const ghost2 = state2.players.find((player) => player.kitId === 'ghost');
    expect(ghost2).toBeDefined();
    if (ghost2 === undefined) {
      return;
    }

    ghost2.lives = 8;
    ghost2.points = 0;
    eliminateWithoutReward(state2, ghost2.id);
    expect(ghost2.points).toBe(0);
  });

  it('helper no-ops for non-Ghost kits', () => {
    const state = createInitialState({
      seats,
      seed: 'ghost-noop',
      kitAssignment: ['kamikaze', 'assassin'],
    });
    const kam = state.players.find((player) => player.kitId === 'kamikaze');
    expect(kam).toBeDefined();
    if (kam === undefined) {
      return;
    }

    kam.points = 0;
    creditGhostLifeLoss(state, kam, 3);
    expect(kam.points).toBe(0);
  });
});
