import { describe, expect, it } from 'vitest';

import { createInitialState } from './create-initial-state';
import { L1_BASIC_ATTACK_COPIES, L1_PLACEHOLDER_RESOURCES } from './l1-placeholders';
import { createRng } from './rng';

describe('createInitialState (L1-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('applies L1 placeholder resources to every player', () => {
    const state = createInitialState({ seats, seed: 'fixed' });

    for (const player of state.players) {
      expect(player.lives).toBe(L1_PLACEHOLDER_RESOURCES.lives);
      expect(player.points).toBe(L1_PLACEHOLDER_RESOURCES.points);
      expect(player.upgradePoints).toBe(L1_PLACEHOLDER_RESOURCES.upgradePoints);
      expect(player.hand).toHaveLength(L1_BASIC_ATTACK_COPIES);
      expect(player.hand.every((card) => card.cardId === 'basic-attack')).toBe(true);
    }
  });

  it('produces a stable turn order for the same seed', () => {
    const first = createInitialState({ seats, seed: 'order-seed' });
    const second = createInitialState({ seats, seed: 'order-seed' });

    expect(second.players.map((player) => player.id)).toEqual(
      first.players.map((player) => player.id),
    );
    expect(second.currentTurnPlayerId).toBe(first.currentTurnPlayerId);
  });

  it('uses the shuffled order as turn order, starting with the first seat', () => {
    const rng = createRng('order-seed');
    const expectedOrder = rng.shuffle([...seats]).map((seat) => seat.id);
    const state = createInitialState({ seats, seed: 'order-seed' });

    expect(state.players.map((player) => player.id)).toEqual(expectedOrder);
    expect(state.currentTurnPlayerId).toBe(expectedOrder[0]);
  });

  it('rejects fewer than two seats', () => {
    expect(() => createInitialState({ seats: [{ id: 'a', nickname: 'Solo' }] })).toThrow(
      RangeError,
    );
  });
});
