/**
 * Specialist kit — rules spec §4, backlog L27-05.
 */

import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';

describe('Specialist kit (L27-05)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('deals two Card Transformer instances with distinct ids', () => {
    const state = createInitialState({
      seats,
      seed: 'specialist-deal',
      kitAssignment: ['specialist', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'specialist');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(8);
    expect(player.points).toBe(4);
    const transformers = player.specialCards.filter(
      (c) => c.cardId === 'card-transformer',
    );
    expect(transformers).toHaveLength(2);
    expect(transformers[0]?.instanceId).not.toBe(transformers[1]?.instanceId);
    expect(player.specialCards.map((c) => c.cardId)).toEqual([
      'card-transformer',
      'card-transformer',
      'card-thief',
      'super-absorber',
    ]);
  });

  it('Absorber bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'specialist-absorber-buy',
      kitAssignment: ['specialist', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'specialist');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'absorber');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });
});
