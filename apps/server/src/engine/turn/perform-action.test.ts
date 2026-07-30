import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('performTurnAction — turn loop (L1-04, L1-05, L1-07, L1-08)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function started() {
    return createInitialState({ seats, seed: 'turn-seed' });
  }

  function requireId(id: string | null | undefined): string {
    if (id === null || id === undefined) {
      throw new Error('expected player id');
    }

    return id;
  }

  function requirePlayer(state: ReturnType<typeof started>, id: string) {
    const player = state.players.find((entry) => entry.id === id);

    if (player === undefined) {
      throw new Error(`missing player ${id}`);
    }

    return player;
  }

  it('rejects an action from a player who is not current', () => {
    const state = started();
    const current = requireId(state.currentTurnPlayerId);
    const other = state.players.find((player) => player.id !== current);

    expect(other).toBeDefined();

    if (other === undefined) {
      return;
    }

    const result = performTurnAction(state, other.id, { type: 'draw' });

    expect(result.ok).toBe(false);
  });

  it('draw grants placeholder draw points and advances the turn', () => {
    const state = started();
    const actorId = requireId(state.currentTurnPlayerId);
    const beforeSequence = state.turnSequence;

    const result = performTurnAction(state, actorId, { type: 'draw' });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('draw');
    expect(requirePlayer(state, actorId).points).toBe(1);
    expect(state.currentTurnPlayerId).not.toBe(actorId);
    expect(state.turnSequence).toBe(beforeSequence + 1);
  });

  it('queues a basic attack and only resolves it after the target acts', () => {
    const state = started();
    const firstId = requireId(state.currentTurnPlayerId);
    const second = state.players.find((player) => player.id !== firstId);

    expect(second).toBeDefined();

    if (second === undefined) {
      return;
    }

    const secondId = second.id;

    performTurnAction(state, firstId, { type: 'draw' });
    expect(state.currentTurnPlayerId).toBe(secondId);

    performTurnAction(state, secondId, { type: 'draw' });
    expect(state.currentTurnPlayerId).toBe(firstId);

    const attackCopy = requirePlayer(state, firstId).hand.find(
      (card) => card.cardId === 'basic-attack',
    );
    expect(attackCopy).toBeDefined();

    if (attackCopy === undefined) {
      return;
    }

    const attack = performTurnAction(state, firstId, {
      type: 'playCard',
      instanceId: attackCopy.instanceId,
      targetPlayerId: secondId,
    });

    expect(attack.ok).toBe(true);
    expect(second.lives).toBe(10);
    expect(second.pendingEffects).toHaveLength(1);

    const afterTargetActs = performTurnAction(state, secondId, { type: 'draw' });

    expect(afterTargetActs.ok).toBe(true);

    if (!afterTargetActs.ok) {
      return;
    }

    expect(afterTargetActs.resolved).toHaveLength(1);
    expect(afterTargetActs.resolved[0]?.livesLost).toBe(1);
    expect(second.lives).toBe(9);
    expect(second.pendingEffects).toHaveLength(0);
  });

  it('resolves pending effects in ascending queuedAt order', () => {
    const state = started();
    const targetId = requireId(state.currentTurnPlayerId);
    const source = state.players.find((player) => player.id !== targetId);

    expect(source).toBeDefined();

    if (source === undefined) {
      return;
    }

    state.turnSequence = 5;
    queueEffect({
      state,
      sourcePlayerId: source.id,
      targetPlayerId: targetId,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    state.turnSequence = 3;
    queueEffect({
      state,
      sourcePlayerId: source.id,
      targetPlayerId: targetId,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const target = requirePlayer(state, targetId);
    expect(target.pendingEffects.map((effect) => effect.queuedAt)).toEqual([5, 3]);

    const result = performTurnAction(state, targetId, { type: 'draw' });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.resolved.map((entry) => entry.livesLost)).toEqual([1, 1]);
    expect(target.lives).toBe(8);
  });

  it('rejects playing basic attack without enough points', () => {
    const state = started();
    const actorId = requireId(state.currentTurnPlayerId);
    const target = state.players.find((player) => player.id !== actorId);

    expect(target).toBeDefined();

    if (target === undefined) {
      return;
    }

    const attackCopy = requirePlayer(state, actorId).hand.find(
      (card) => card.cardId === 'basic-attack',
    );
    expect(attackCopy).toBeDefined();

    if (attackCopy === undefined) {
      return;
    }

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: attackCopy.instanceId,
      targetPlayerId: target.id,
    });

    expect(result.ok).toBe(false);
  });

  it('buys and sells a card as the turn action (L2-01)', () => {
    const state = started();
    const actorId = requireId(state.currentTurnPlayerId);
    const player = requirePlayer(state, actorId);
    player.points = 5;

    const bought = performTurnAction(state, actorId, {
      type: 'buyCard',
      cardId: 'basic-attack',
    });

    expect(bought.ok).toBe(true);

    if (!bought.ok) {
      return;
    }

    expect(bought.actionPlayed.action).toBe('buyCard');
    expect(player.points).toBe(3);
    expect(state.currentTurnPlayerId).not.toBe(actorId);

    // Other player draws so the buyer can act again.
    const otherId = requireId(state.currentTurnPlayerId);
    performTurnAction(state, otherId, { type: 'draw' });
    expect(state.currentTurnPlayerId).toBe(actorId);

    const boughtCopy = player.hand.find(
      (card) => card.cardId === 'basic-attack' && card.instanceId !== player.hand[0]?.instanceId,
    );
    const toSell = player.hand.at(-1);
    expect(toSell).toBeDefined();

    if (toSell === undefined) {
      return;
    }

    void boughtCopy;
    const sold = performTurnAction(state, actorId, {
      type: 'sellCard',
      instanceId: toSell.instanceId,
    });

    expect(sold.ok).toBe(true);

    if (!sold.ok) {
      return;
    }

    expect(sold.actionPlayed.action).toBe('sellCard');
    expect(state.pool.some((card) => card.instanceId === toSell.instanceId)).toBe(true);
  });

  it('eliminates at 0 lives and declares the last survivor the winner', () => {
    const state = started();
    const attackerId = requireId(state.currentTurnPlayerId);
    const defender = state.players.find((player) => player.id !== attackerId);

    expect(defender).toBeDefined();

    if (defender === undefined) {
      return;
    }

    defender.lives = 1;
    queueEffect({
      state,
      sourcePlayerId: attackerId,
      targetPlayerId: defender.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    // It must be the defender's turn for the effect to resolve after their action.
    state.currentTurnPlayerId = defender.id;

    const result = performTurnAction(state, defender.id, { type: 'draw' });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.eliminatedPlayerIds).toContain(defender.id);
    expect(result.winnerPlayerId).toBe(attackerId);
    expect(defender.isEliminated).toBe(true);
  });
});
