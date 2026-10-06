/**
 * Forfeit rewards — rules spec §6, Lot 71.
 * The Forfeit button and leaving the table pay queued attackers and active Poison.
 * The turn timer and inactivity stay on eliminateWithoutReward and pay nobody.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { makeCounterEffect } from '../../testing/factories';
import { applyPlayingForfeit } from '../../rooms/playing-forfeit';
import {
  applyDefaultEliminationRewards,
  applyEliminationRewardChoices,
  eliminateForForfeit,
  eliminateWithoutReward,
  findSoleSurvivorId,
} from './elimination-rewards';

function pendingAttack(sourcePlayerId: string, targetPlayerId: string, id: string) {
  return {
    id,
    cardId: 'basic-attack' as const,
    sourcePlayerId,
    targetPlayerId,
    queuedAt: 1,
    isUpgraded: false,
    damageMultiplier: 1,
    redirectedBy: null,
    chosenInstanceId: null,
  };
}

describe('forfeit rewards (rules spec §6, Lot 71)', () => {
  it('pays one living attacker before the forfeiter cards reach the pool', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l71-forfeit-attack',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.hand = [{ instanceId: 'only-card', cardId: 'basic-attack', isUpgraded: false }];
    alice.specialCards = [];
    alice.pendingEffects = [pendingAttack(bob.id, alice.id, 'hit-b')];
    bob.lives = 6;
    bob.points = 3;
    state.currentTurnPlayerId = 'c';

    const result = applyPlayingForfeit(state, alice.id);

    expect(result.eliminated).toBe(true);
    expect(result.rewardChoicePending).toBe(true);
    expect(state.pool).toHaveLength(0);
    expect(alice.hand).toHaveLength(1);
    expect(state.rewardQueue.map((job) => job.eliminatorPlayerId)).toEqual([bob.id]);
    state.suppressTurnAdvanceAfterRewards = true;

    const paid = applyEliminationRewardChoices(
      state,
      bob.id,
      `elim:0:${alice.id}:${bob.id}`,
      [{ type: 'lives' }, { type: 'lives' }],
      1_000,
    );

    expect(paid.ok).toBe(true);
    if (!paid.ok) {
      return;
    }
    expect(bob.lives).toBe(14);
    expect(paid.turnAdvanced).toBe(false);
    expect(state.currentTurnPlayerId).toBe('c');
    expect(state.pool.some((card) => card.instanceId === 'only-card')).toBe(true);
    expect(alice.hand).toHaveLength(0);
  });

  it('orders fewest lives then fewest points, and a taken card is gone', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l71-forfeit-order',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const cara = state.players.find((player) => player.id === 'c');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(cara).toBeDefined();
    if (alice === undefined || bob === undefined || cara === undefined) {
      return;
    }

    alice.hand = [{ instanceId: 'only-card', cardId: 'spy', isUpgraded: false }];
    alice.specialCards = [];
    alice.pendingEffects = [
      pendingAttack(bob.id, alice.id, 'hit-b'),
      pendingAttack(bob.id, alice.id, 'hit-b-2'),
      pendingAttack(cara.id, alice.id, 'hit-c'),
    ];
    bob.lives = 8;
    bob.points = 1;
    bob.upgradePoints = 0;
    cara.lives = 3;
    cara.points = 9;

    eliminateForForfeit(state, alice.id, undefined, 1_000);

    expect(state.rewardQueue.map((job) => job.eliminatorPlayerId)).toEqual([cara.id, bob.id]);

    const first = applyEliminationRewardChoices(
      state,
      cara.id,
      `elim:0:${alice.id}:${cara.id}`,
      [
        { type: 'card', instanceId: 'only-card' },
        { type: 'points' },
      ],
      1_000,
    );
    expect(first.ok).toBe(true);
    expect(cara.points).toBe(17);
    expect(cara.hand.some((card) => card.instanceId === 'only-card')).toBe(true);
    expect(state.pool).toHaveLength(0);

    const rejected = applyEliminationRewardChoices(
      state,
      bob.id,
      `elim:0:${alice.id}:${bob.id}`,
      [
        { type: 'card', instanceId: 'only-card' },
        { type: 'lives' },
      ],
      1_000,
    );
    expect(rejected.ok).toBe(false);

    const second = applyEliminationRewardChoices(
      state,
      bob.id,
      `elim:0:${alice.id}:${bob.id}`,
      [{ type: 'upgradePoint' }, { type: 'upgradePoint' }],
      1_000,
    );
    expect(second.ok).toBe(true);
    expect(bob.upgradePoints).toBe(2);
    expect(state.pool).toHaveLength(0);
    expect(alice.hand).toHaveLength(0);
  });

  it('pays active Poison once, and ignores Thief, Imposition, Sentence, and Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
        { id: 'd', nickname: 'Dee' },
      ],
      seed: 'l71-forfeit-poison',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const cara = state.players.find((player) => player.id === 'c');
    const dee = state.players.find((player) => player.id === 'd');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(cara).toBeDefined();
    expect(dee).toBeDefined();
    if (alice === undefined || bob === undefined || cara === undefined || dee === undefined) {
      return;
    }

    alice.pendingEffects = [
      {
        id: 'thief-b',
        cardId: 'thief',
        sourcePlayerId: bob.id,
        targetPlayerId: alice.id,
        queuedAt: 1,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
      {
        id: 'sentence-c',
        cardId: 'sentence',
        sourcePlayerId: cara.id,
        targetPlayerId: alice.id,
        queuedAt: 2,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    bob.activePersistentEffects = [
      makeCounterEffect({ id: 'imp', cardId: 'imposition', counter: 2 }),
    ];
    cara.activePersistentEffects = [
      makeCounterEffect({ id: 'curse', cardId: 'curse', counter: null }),
    ];
    dee.activePersistentEffects = [
      makeCounterEffect({ id: 'poison', cardId: 'poison', counter: 3 }),
    ];
    alice.activePersistentEffects = [
      makeCounterEffect({ id: 'self-poison', cardId: 'poison', counter: 3 }),
    ];
    dee.lives = 2;
    bob.lives = 4;
    cara.lives = 4;
    const handSize = alice.hand.length;

    const result = eliminateForForfeit(state, alice.id, undefined, 1_000);

    expect(result.rewardChoicePending).toBe(true);
    expect(state.rewardQueue.map((job) => job.eliminatorPlayerId)).toEqual([dee.id]);
    expect(alice.hand).toHaveLength(handSize);
    expect(state.pool.some((card) => card.cardId === 'poison')).toBe(true);
  });

  it('pays one player who both attacked and has Poison', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l71-forfeit-once',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.pendingEffects = [pendingAttack(bob.id, alice.id, 'hit')];
    bob.lives = 10;
    bob.activePersistentEffects = [
      makeCounterEffect({ id: 'poison', cardId: 'poison', counter: 3 }),
    ];

    eliminateForForfeit(state, alice.id, undefined, 1_000);

    expect(state.rewardQueue).toHaveLength(1);
    expect(state.rewardQueue[0]?.eliminatorPlayerId).toBe(bob.id);
    expect(findSoleSurvivorId(state)).toBe(bob.id);

    const settled = applyDefaultEliminationRewards(state, 1_000);
    expect(settled.ok).toBe(true);
    if (!settled.ok) {
      return;
    }
    expect(settled.winnerPlayerId).toBe(bob.id);
    expect(bob.lives).toBe(18);
  });

  it('pays nobody when nothing queued is an attack and nobody has Poison', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l71-forfeit-none',
    });
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    const handSize = alice.hand.length + alice.specialCards.length;
    const result = eliminateForForfeit(state, alice.id, undefined, 1_000);

    expect(result.rewardChoicePending).toBe(false);
    expect(state.rewardQueue).toHaveLength(0);
    expect(state.pool).toHaveLength(handSize);
    expect(alice.hand).toHaveLength(0);
  });

  it('does not pay for inactivity or the turn-timer path', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l71-forfeit-timer',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.pendingEffects = [pendingAttack(bob.id, alice.id, 'hit')];
    bob.lives = 10;
    bob.activePersistentEffects = [
      makeCounterEffect({ id: 'poison', cardId: 'poison', counter: 3 }),
    ];
    const handSize = alice.hand.length + alice.specialCards.length;

    expect(eliminateWithoutReward(state, alice.id).eliminated).toBe(true);
    expect(state.rewardQueue).toHaveLength(0);
    expect(state.rewardChoice).toBeNull();
    expect(state.pool).toHaveLength(handSize);
    expect(bob.lives).toBe(10);
  });
});
