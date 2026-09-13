/**
 * Auto-loss public log — L56-07 / PROTOCOL_VERSION 31.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { eliminateWithoutReward } from './elimination-rewards';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

const dir = dirname(fileURLToPath(import.meta.url));

function twoSeatState(seed: string) {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'Alice' },
      { id: 'b', nickname: 'Bob' },
    ],
    seed,
  });
  const attacker = state.players.find((player) => player.id === 'a');
  const defender = state.players.find((player) => player.id === 'b');

  if (attacker === undefined || defender === undefined) {
    throw new Error('missing players');
  }

  attacker.shield = 0;
  defender.shield = 0;
  defender.pendingEffects = [];
  return { state, attacker, defender };
}

function resolveQueuedBasicOnDefender(
  state: ReturnType<typeof twoSeatState>['state'],
  attackerId: string,
  defenderId: string,
) {
  queueEffect({
    state,
    sourcePlayerId: attackerId,
    targetPlayerId: defenderId,
    cardId: 'basic-attack',
    isUpgraded: false,
  });
  state.currentTurnPlayerId = defenderId;
  return performTurnAction(state, defenderId, { type: 'draw' });
}

describe('persistentDeactivated log (L56-07)', () => {
  it.each(['poison', 'super-absorber', 'imposition', 'points-generator'] as const)(
    'logs one lost line when %s hits counter 0 from attack damage',
    (cardId) => {
    const { state, attacker, defender } = twoSeatState(`l56-07-${cardId}`);
    defender.lives = 10;
    defender.activePersistentEffects = [
      makeCounterEffect({ id: `${cardId}-1`, cardId, counter: 1 }),
    ];

    const result = resolveQueuedBasicOnDefender(state, attacker.id, defender.id);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.persistentDeactivations).toEqual([
      {
        ownerPlayerId: defender.id,
        cardId,
        isUpgraded: false,
        turnSequence: result.actionPlayed.turnSequence,
      },
    ]);
    expect(defender.activePersistentEffects).toHaveLength(0);
  });

  it('logs Curse at 1 life even with counter null', () => {
    const { state, defender } = twoSeatState('l56-07-curse-floor');
    defender.lives = 1;
    defender.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        originalCasterPlayerId: 'a',
      }),
    ];
    state.currentTurnPlayerId = defender.id;

    const result = performTurnAction(state, defender.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.persistentDeactivations).toEqual([
      {
        ownerPlayerId: defender.id,
        cardId: 'curse',
        isUpgraded: false,
        turnSequence: result.actionPlayed.turnSequence,
      },
    ]);
    expect(defender.activePersistentEffects).toHaveLength(0);
  });

  it('does not log a counter loss from Tax / applyLifeLoss', () => {
    const { state, attacker } = twoSeatState('l56-07-tax');
    attacker.lives = 5;
    attacker.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator', counter: 3 }),
    ];
    attacker.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = attacker.id;

    const result = performTurnAction(state, attacker.id, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.persistentDeactivations).toBeUndefined();
    expect(attacker.activePersistentEffects[0]?.counter).toBe(3);
  });

  it('logs remaining persistents on death dump', () => {
    const { state, defender } = twoSeatState('l56-07-death');
    defender.lives = 0;
    defender.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    state.currentTurnPlayerId = defender.id;

    const result = performTurnAction(state, defender.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.persistentDeactivations).toEqual([
      {
        ownerPlayerId: defender.id,
        cardId: 'invisibility',
        isUpgraded: false,
        turnSequence: result.actionPlayed.turnSequence,
      },
    ]);
    expect(defender.isEliminated).toBe(true);
  });

  it('keeps manual deactivate on actionPlayed and does not emit persistentDeactivated', () => {
    const { state, attacker } = twoSeatState('l56-07-manual');
    attacker.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    state.currentTurnPlayerId = attacker.id;

    const result = performTurnAction(state, attacker.id, {
      type: 'deactivatePersistent',
      effectId: 'inv-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('deactivatePersistent');
    expect(result.actionPlayed.cardId).toBe('invisibility');
    expect(result.persistentDeactivations).toBeUndefined();
  });

  it('logs remaining persistents on leave/forfeit dump', () => {
    const { state, defender } = twoSeatState('l56-07-forfeit');
    defender.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator', counter: 2 }),
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];

    const dumped = eliminateWithoutReward(state, defender.id);

    expect(dumped.eliminated).toBe(true);
    expect(dumped.persistentDeactivations).toEqual([
      {
        ownerPlayerId: defender.id,
        cardId: 'points-generator',
        isUpgraded: false,
        turnSequence: state.turnSequence,
      },
      {
        ownerPlayerId: defender.id,
        cardId: 'invisibility',
        isUpgraded: false,
        turnSequence: state.turnSequence,
      },
    ]);
    expect(defender.activePersistentEffects).toHaveLength(0);
  });

  it('does not treat consumed Reanimation as a lost persistent', () => {
    const { state, defender } = twoSeatState('l56-07-reanim-spend');
    defender.activePersistentEffects = [
      makeCounterEffect({ id: 're-1', cardId: 'reanimation', counter: null }),
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator', counter: 3 }),
    ];

    const dumped = eliminateWithoutReward(state, defender.id);

    expect(dumped.eliminated).toBe(true);
    expect(dumped.persistentDeactivations).toEqual([
      {
        ownerPlayerId: defender.id,
        cardId: 'points-generator',
        isUpgraded: false,
        turnSequence: state.turnSequence,
      },
    ]);
  });

  it('does not attach a forfeit dump to a later turn after a rejected action', () => {
    const { state, attacker, defender } = twoSeatState('l56-07-reject-leak');
    attacker.points = 0;
    state.currentTurnPlayerId = attacker.id;
    const rejected = performTurnAction(state, attacker.id, {
      type: 'buyCard',
      cardId: 'super-attack',
    });
    expect(rejected.ok).toBe(false);

    defender.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator', counter: 3 }),
    ];
    const dumped = eliminateWithoutReward(state, defender.id);
    expect(dumped.persistentDeactivations).toHaveLength(1);

    const next = performTurnAction(state, attacker.id, { type: 'draw' });
    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }

    expect(next.persistentDeactivations).toBeUndefined();
  });

  it('wires the kind onto the room and simulator logs', () => {
    const room = readFileSync(join(dir, '../../rooms/game-room.ts'), 'utf8');
    const sim = readFileSync(join(dir, '../../simulation/run-game.ts'), 'utf8');
    const forfeit = readFileSync(join(dir, '../../rooms/playing-forfeit.ts'), 'utf8');
    expect(room).toContain("kind: 'persistentDeactivated'");
    expect(room).toContain('appendPersistentDeactivations');
    expect(room).toContain('left.persistentDeactivations');
    expect(forfeit).toContain('persistentDeactivations');
    expect(sim).toContain("kind: 'persistentDeactivated'");
  });
});
