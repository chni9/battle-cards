/**
 * Witch kit — rules spec §4, backlog L27-07.
 */

import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Witch kit (L27-07)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog and deals both specials', () => {
    const state = createInitialState({
      seats,
      seed: 'witch-catalog',
      kitAssignment: ['witch', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'witch');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(10);
    expect(player.points).toBe(0);
    expect(player.upgradePoints).toBe(1);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['reanimation', 'poison']);
  });

  it('Thief bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'witch-thief-buy',
      kitAssignment: ['witch', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'witch');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'thief');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });

  it('starting Reanimation and Poison are playable', () => {
    const state = createInitialState({
      seats,
      seed: 'witch-play-specials',
      kitAssignment: ['witch', 'kamikaze'],
    });
    const witch = state.players.find((p) => p.kitId === 'witch');
    expect(witch).toBeDefined();
    if (witch === undefined) {
      return;
    }

    const reanimation = witch.specialCards.find((c) => c.cardId === 'reanimation');
    const poison = witch.specialCards.find((c) => c.cardId === 'poison');
    expect(reanimation).toBeDefined();
    expect(poison).toBeDefined();
    if (reanimation === undefined || poison === undefined) {
      return;
    }

    witch.points = 50;
    state.currentTurnPlayerId = witch.id;

    const playReanimation = performTurnAction(state, witch.id, {
      type: 'playCard',
      instanceId: reanimation.instanceId,
    });
    expect(playReanimation.ok).toBe(true);
    expect(
      witch.activePersistentEffects.some((effect) => effect.cardId === 'reanimation'),
    ).toBe(true);

    // Advance to witch's next turn to play Poison.
    const other = state.players.find((p) => p.id !== witch.id);
    expect(other).toBeDefined();
    if (other === undefined) {
      return;
    }

    while (state.currentTurnPlayerId !== witch.id) {
      expect(performTurnAction(state, other.id, { type: 'draw' }).ok).toBe(true);
    }

    witch.points = 50;
    const playPoison = performTurnAction(state, witch.id, {
      type: 'playCard',
      instanceId: poison.instanceId,
    });
    expect(playPoison.ok).toBe(true);
    expect(witch.activePersistentEffects.some((effect) => effect.cardId === 'poison')).toBe(
      true,
    );
  });
});
