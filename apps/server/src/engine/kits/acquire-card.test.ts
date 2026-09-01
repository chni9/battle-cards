import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { isImmuneTo } from './is-immune-to';

describe('alwaysUpgraded on acquisition (L4-01)', () => {
  it('Scientific buying Spy mid-game gets an upgraded copy without spending upgrade points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'scientific-buy-spy',
    });
    const buyer = state.players[0];
    expect(buyer).toBeDefined();
    if (buyer === undefined) {
      return;
    }

    buyer.kitId = 'scientific';
    buyer.points = 4;
    buyer.upgradePoints = 2;
    const handBefore = buyer.hand.length;

    const result = buyCard(state, buyer.id, 'spy');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.instance.isUpgraded).toBe(true);
    expect(buyer.upgradePoints).toBe(2);
    expect(buyer.hand).toHaveLength(handBefore + 1);
    expect(buyer.hand.at(-1)?.cardId).toBe('spy');
    expect(buyer.hand.at(-1)?.isUpgraded).toBe(true);
  });

  it('non-Scientific buying Spy gets a base copy', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'kamikaze-buy-spy',
    });
    const buyer = state.players[0];
    expect(buyer).toBeDefined();
    if (buyer === undefined) {
      return;
    }

    buyer.kitId = 'kamikaze';
    buyer.points = 4;

    const result = buyCard(state, buyer.id, 'spy');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.instance.isUpgraded).toBe(false);
  });
});

describe('isImmuneTo (L4-01 helper)', () => {
  it('Untouchable is immune to thief and spy only', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'immune-helper',
    });
    const player = state.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    player.kitId = 'untouchable';

    expect(isImmuneTo(player, 'thief')).toBe(true);
    expect(isImmuneTo(player, 'spy')).toBe(true);
    expect(isImmuneTo(player, 'spy-thief')).toBe(false);
    expect(isImmuneTo(player, 'basic-attack')).toBe(false);
  });
});
