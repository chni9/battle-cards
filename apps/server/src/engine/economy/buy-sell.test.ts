/**
 * Economy actions — buy/sell cards (L2-01).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { buyCard } from './buy-card';
import { sellCard } from './sell-card';

describe('buyCard / sellCard (rules spec §1, L2-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function started() {
    return createInitialState({ seats, seed: 'economy-seed' });
  }

  function actor(state: ReturnType<typeof started>) {
    const id = state.currentTurnPlayerId;

    if (id === null) {
      throw new Error('no current player');
    }

    const player = state.players.find((entry) => entry.id === id);

    if (player === undefined) {
      throw new Error('missing actor');
    }

    return player;
  }

  it('buys a basic attack for 2 points and adds a non-upgraded copy to the hand', () => {
    const state = started();
    const player = actor(state);
    player.points = 5;
    const before = player.hand.length;

    const result = buyCard(state, player.id, 'basic-attack');

    expect(result.ok).toBe(true);
    expect(player.points).toBe(3);
    expect(player.hand).toHaveLength(before + 1);
    expect(player.hand.at(-1)?.cardId).toBe('basic-attack');
    expect(player.hand.at(-1)?.isUpgraded).toBe(false);
    expect(player.turnLedger.pointsSpent).toBe(2);
  });

  it('rejects buying Tax when lives are below 2', () => {
    const state = started();
    const player = actor(state);
    player.lives = 1;

    const result = buyCard(state, player.id, 'tax');

    expect(result.ok).toBe(false);
    expect(player.lives).toBe(1);
    expect(player.hand.every((card) => card.cardId !== 'tax')).toBe(true);
  });

  it('buys Tax for 2 lives via applyLifeLoss path', () => {
    const state = started();
    const player = actor(state);
    player.lives = 5;
    player.shield = 3;

    const result = buyCard(state, player.id, 'tax');

    expect(result.ok).toBe(true);
    expect(player.lives).toBe(3);
    expect(player.shield).toBe(3);
    expect(player.turnLedger.livesLost).toBe(2);
  });

  it('sells a basic attack for 1 point into the pool', () => {
    const state = started();
    const player = actor(state);
    const copy = player.hand[0];

    expect(copy).toBeDefined();

    if (copy === undefined) {
      return;
    }

    player.points = 0;
    const result = sellCard(state, player.id, copy.instanceId);

    expect(result.ok).toBe(true);
    expect(player.points).toBe(1);
    expect(player.hand.find((card) => card.instanceId === copy.instanceId)).toBeUndefined();
    expect(state.pool).toContainEqual(copy);
  });

  it('sells Tax for 1 life (25-cap applied) and ignores upgrade on shop price', () => {
    const state = started();
    const player = actor(state);
    player.lives = 10;
    const taxCopy = {
      instanceId: 'tax-1',
      cardId: 'tax' as const,
      isUpgraded: true,
    };
    player.hand.push(taxCopy);

    const result = sellCard(state, player.id, taxCopy.instanceId);

    expect(result.ok).toBe(true);
    expect(player.lives).toBe(11);
    expect(state.pool).toContainEqual(taxCopy);
  });

  it('buys and sells Regeneration at 6 / 3 points', () => {
    const state = started();
    const player = actor(state);
    player.points = 10;

    const bought = buyCard(state, player.id, 'regeneration');
    expect(bought.ok).toBe(true);
    expect(player.points).toBe(4);

    if (!bought.ok) {
      return;
    }

    const sold = sellCard(state, player.id, bought.instance.instanceId);
    expect(sold.ok).toBe(true);
    expect(player.points).toBe(7);
  });

  it('rejects buying a special card individually', () => {
    const state = started();
    const player = actor(state);
    player.points = 100;

    const result = buyCard(state, player.id, 'suicide');

    expect(result.ok).toBe(false);
  });
});
