/**
 * Block — rules spec §5, backlog L25-01, #V4-6 / #V4-7 / #V4-8.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { recordConnectedTimeout } from '../lifecycle/connection';
import { advanceTurn } from './advance-turn';
import { listAssassinMultiAttackCandidates } from './assassin-candidates';
import { endBlockChain, grantBlockTurns } from './grant-block-turns';
import { listLegalActions } from './list-legal-actions';
import { listLegalPlayCardActions } from './list-legal-play-card';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('Block (L25-01)', () => {
  const stableSeats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;
  /** Pin kits — random KIT_IDS assignment shifts when Lot 27 kits land (Tactician = 1 life). */
  const stableKits = ['untouchable', 'kamikaze'] as const;

  it('cancels pending against the user with public blocked outcomes; leaves persistents (#V4-7)', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-cancel',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    state.currentTurnPlayerId = alice.id;
    alice.points = 20;
    alice.specialCards = [{ instanceId: 'block-1', cardId: 'block', isUpgraded: false }];
    alice.pendingEffects = [];
    bob.pendingEffects = [];

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'thief',
      isUpgraded: false,
    });
    expect(alice.pendingEffects).toHaveLength(2);

    bob.activePersistentEffects = [
      makeCounterEffect({
        id: 'poison-on-a',
        cardId: 'poison',
        counter: 3,
        targetPlayerId: null,
      }),
    ];

    const result = performTurnAction(state, alice.id, {
      type: 'playCard',
      instanceId: 'block-1',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(alice.pendingEffects).toHaveLength(0);
    expect(result.resolved.filter((entry) => entry.outcome === 'blocked')).toHaveLength(2);
    expect(bob.activePersistentEffects).toHaveLength(1);
    // Play ends → advance starts first consecutive turn (remaining 3 → 2).
    expect(alice.blockTurnsRemaining).toBe(2);
    expect(alice.blockAttacksForbidden).toBe(true);
    expect(state.currentTurnPlayerId).toBe('a');
  });

  it('grants 7 consecutive turns when upgraded', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-up',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    alice.points = 20;
    alice.specialCards = [{ instanceId: 'block-1', cardId: 'block', isUpgraded: true }];

    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'block-1' }).ok,
    ).toBe(true);
    // First of 7 consecutive turns already started after play advances.
    expect(alice.blockTurnsRemaining).toBe(6);
    expect(alice.blockAttacksForbidden).toBe(true);
    expect(state.currentTurnPlayerId).toBe('a');
  });

  it('bans attack play and Assassin multi while ban holds, including last chain turn', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-ban',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    alice.kitId = 'assassin';
    alice.points = 50;
    alice.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'atk-2', cardId: 'strong-attack', isUpgraded: false },
    ];
    grantBlockTurns(alice, 1);
    // Simulate last consecutive turn: remaining already 0, ban still on.
    advanceTurn(state);
    expect(alice.blockTurnsRemaining).toBe(0);
    expect(alice.blockAttacksForbidden).toBe(true);
    expect(state.currentTurnPlayerId).toBe('a');

    const play = performTurnAction(state, alice.id, {
      type: 'playCard',
      instanceId: 'atk-1',
      targetPlayerId: 'b',
    });
    expect(play.ok).toBe(false);

    const legal = listLegalPlayCardActions(state, alice);
    expect(
      legal.some(
        (action) =>
          action.type === 'playCard' &&
          (action.instanceId === 'atk-1' || action.instanceId === 'atk-2'),
      ),
    ).toBe(false);
    expect(listAssassinMultiAttackCandidates(state, alice)).toEqual([]);
  });

  it('allows buying and upgrading attacks during the Block chain', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-buy',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    alice.points = 50;
    alice.upgradePoints = 2;
    alice.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    grantBlockTurns(alice, 2);
    advanceTurn(state);

    const legal = listLegalActions(state, alice.id);
    expect(legal.some((action) => action.type === 'buyCard' && action.cardId === 'basic-attack')).toBe(
      true,
    );
    expect(
      legal.some((action) => action.type === 'upgradeCard' && action.instanceId === 'atk-1'),
    ).toBe(true);

    expect(
      performTurnAction(state, alice.id, { type: 'upgradeCard', instanceId: 'atk-1' }).ok,
    ).toBe(true);
    expect(alice.hand[0]?.isUpgraded).toBe(true);
  });

  it('timeout-style #V4-6 end clears the chain so the next advance leaves the seat', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-timeout',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    grantBlockTurns(alice, 7);
    advanceTurn(state);
    expect(alice.blockTurnsRemaining).toBe(6);
    expect(alice.blockAttacksForbidden).toBe(true);

    // Room path: one timeout counts once, then ends the chain before auto-draw advances.
    expect(recordConnectedTimeout(alice)).toBe(false);
    endBlockChain(alice);
    expect(alice.blockTurnsRemaining).toBe(0);
    expect(alice.blockAttacksForbidden).toBe(false);
    expect(alice.connectionState.consecutiveTimeouts).toBe(1);

    advanceTurn(state);
    expect(state.currentTurnPlayerId).toBe('b');
  });

  it('resets the ledger each Block turn so Absorber sees only the latest (#V4-8)', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-ledger',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    state.currentTurnPlayerId = alice.id;
    grantBlockTurns(alice, 2);
    alice.turnLedger.livesLost = 5;
    advanceTurn(state);
    // Mid-chain advance zeros the prior Block turn's ledger.
    expect(alice.turnLedger.livesLost).toBe(0);
    expect(alice.blockTurnsRemaining).toBe(1);
    expect(state.currentTurnPlayerId).toBe('a');

    // Enter last Block turn (remaining 1 → 0); ledger resets at that advance too.
    advanceTurn(state);
    expect(alice.blockTurnsRemaining).toBe(0);
    expect(alice.turnLedger.livesLost).toBe(0);

    alice.turnLedger.livesLost = 3;
    advanceTurn(state);
    expect(state.currentTurnPlayerId).toBe('b');
    expect(alice.turnLedger.livesLost).toBe(3);

    bob.lives = 10;
    bob.points = 20;
    bob.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];
    bob.specialCards = [];
    bob.pendingEffects = [];
    const absorb = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: alice.id,
    });
    expect(absorb).toEqual(expect.objectContaining({ ok: true }));
    expect(bob.lives).toBe(13);
  });

  it('clears the attack ban when the chain completes normally', () => {
    const state = createInitialState({
      seats: stableSeats,
      seed: 'l25-01-complete',
      kitAssignment: stableKits,
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    grantBlockTurns(alice, 1);
    advanceTurn(state);
    expect(alice.blockAttacksForbidden).toBe(true);
    advanceTurn(state);
    expect(state.currentTurnPlayerId).toBe('b');
    expect(alice.blockAttacksForbidden).toBe(false);
  });
});
