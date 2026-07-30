/**
 * Turn ledger spend vs theft — technical spec §4.4, backlog L3-07.
 *
 * Writers already exist on play costs, shop, damage resolve, Tax, and stealPoints.
 * This task locks the spend-vs-theft contract with an acceptance test.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Turn ledger (tech §4.4, L3-07)', () => {
  it('distinguishes Tax life loss and pointsSpent from pointsLostToTheft', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'ledger-spend-theft',
    });

    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.points = 5;
    alice.hand = [{ instanceId: 'th-1', cardId: 'thief', isUpgraded: false }];
    bob.points = 5;

    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'th-1',
      targetPlayerId: 'b',
    });

    // Alice spent 5 on Thief (her ledger was reset when turn advanced to Bob).
    state.currentTurnPlayerId = 'b';
    bob.lives = 10;
    bob.points = 5;
    bob.hand = [
      { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
      { instanceId: 'sh-1', cardId: 'shield', isUpgraded: false },
    ];
    // Give Bob enough points to also buy a shield after Tax? One action only.
    // Tax then Thief resolve: Tax +4 pts → 9, steal min(10,9)=9.
    const bobTurn = performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(bobTurn.ok).toBe(true);
    expect(bob.turnLedger.livesLost).toBe(1);
    expect(bob.turnLedger.pointsSpent).toBe(0);
    expect(bob.turnLedger.pointsLostToTheft).toBe(9);
    expect(alice.points).toBe(9);
  });

  it('records Regeneration cost as pointsSpent, not theft', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'ledger-regen-spend',
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();

    if (alice === undefined) {
      return;
    }

    alice.lives = 10;
    alice.points = 6;
    alice.hand = [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }];

    // Observe ledger before advance by resolving through a helper path:
    // performTurnAction advances and resets the *next* player only.
    const result = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 2,
    });

    expect(result.ok).toBe(true);
    expect(alice.points).toBe(0);
    expect(alice.lives).toBe(12);
    // Alice's ledger from this turn survives until she becomes current again.
    expect(alice.turnLedger.pointsSpent).toBe(6);
    expect(alice.turnLedger.pointsLostToTheft).toBe(0);
  });
});
