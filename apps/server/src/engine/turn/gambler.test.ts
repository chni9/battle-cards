/**
 * Gambler starting loadout — rules spec §4, designer 2026-09-20 / L63-01.
 */

import { getKit, randomStartingSpecialPool } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { dealStartingLoadout } from '../reanimate-player';

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
