/**
 * Juggernaut kit — rules spec §4, backlog L27-09.
 */

import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { queueEffect } from './queue-effect';
import { performTurnAction } from './perform-action';

describe('Juggernaut kit (L27-09)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog', () => {
    expect(getKit('juggernaut').startingResources).toEqual({
      lives: 14,
      points: 4,
      upgradePoints: 1,
      draw: 1,
    });
    expect(getKit('juggernaut').startingCardCounts).toEqual({ action: 4, attack: 2 });
    expect(getKit('juggernaut').traits.alwaysUpgraded).toEqual(['shield']);
    expect(getKit('juggernaut').specialCards).toEqual(['super-mirror']);

    const state = createInitialState({
      seats,
      seed: 'juggernaut-catalog',
      kitAssignment: ['juggernaut', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'juggernaut');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(14);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['super-mirror']);
    expect(
      player.hand.filter((c) => c.cardId === 'shield').every((c) => c.isUpgraded),
    ).toBe(true);
  });

  it('Shield bought mid-game arrives upgraded; play blocks Thief without spending UP', () => {
    const state = createInitialState({
      seats,
      seed: 'juggernaut-shield-block',
      kitAssignment: ['juggernaut', 'assassin'],
    });
    const juggernaut = state.players.find((p) => p.kitId === 'juggernaut');
    const foe = state.players.find((p) => p.kitId !== 'juggernaut');
    expect(juggernaut).toBeDefined();
    expect(foe).toBeDefined();
    if (juggernaut === undefined || foe === undefined) {
      return;
    }

    juggernaut.points = 50;
    juggernaut.upgradePoints = 3;
    juggernaut.hand = [];
    juggernaut.shield = 0;
    juggernaut.shieldIsUpgraded = false;
    juggernaut.pendingEffects = [];

    const upBefore = juggernaut.upgradePoints;
    const bought = buyCard(state, juggernaut.id, 'shield');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(juggernaut.upgradePoints).toBe(upBefore);

    state.currentTurnPlayerId = juggernaut.id;
    expect(
      performTurnAction(state, juggernaut.id, {
        type: 'playCard',
        instanceId: bought.instance.instanceId,
      }).ok,
    ).toBe(true);
    expect(juggernaut.shield).toBe(7);
    expect(juggernaut.shieldIsUpgraded).toBe(true);
    expect(juggernaut.upgradePoints).toBe(upBefore);

    queueEffect({
      state,
      sourcePlayerId: foe.id,
      targetPlayerId: juggernaut.id,
      cardId: 'thief',
      isUpgraded: false,
    });
    juggernaut.points = 20;

    state.currentTurnPlayerId = juggernaut.id;
    const resolve = performTurnAction(state, juggernaut.id, { type: 'draw' });
    expect(resolve.ok).toBe(true);
    if (!resolve.ok) {
      return;
    }

    expect(resolve.resolved.some((entry) => entry.outcome === 'cancelled')).toBe(true);
    expect(juggernaut.points).toBe(20 + 1); // draw only; Thief cancelled
  });

  it('starting Super Mirror is playable when an attack is pending', () => {
    const state = createInitialState({
      seats,
      seed: 'juggernaut-super-mirror',
      kitAssignment: ['juggernaut', 'assassin'],
    });
    const juggernaut = state.players.find((p) => p.kitId === 'juggernaut');
    const foe = state.players.find((p) => p.kitId !== 'juggernaut');
    expect(juggernaut).toBeDefined();
    expect(foe).toBeDefined();
    if (juggernaut === undefined || foe === undefined) {
      return;
    }

    const mirror = juggernaut.specialCards.find((c) => c.cardId === 'super-mirror');
    expect(mirror).toBeDefined();
    if (mirror === undefined) {
      return;
    }

    queueEffect({
      state,
      sourcePlayerId: foe.id,
      targetPlayerId: juggernaut.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    juggernaut.points = 50;
    state.currentTurnPlayerId = juggernaut.id;

    const play = performTurnAction(state, juggernaut.id, {
      type: 'playCard',
      instanceId: mirror.instanceId,
    });
    expect(play.ok).toBe(true);
    expect(foe.pendingEffects.some((effect) => effect.redirectedBy === 'super-mirror')).toBe(
      true,
    );
  });
});
