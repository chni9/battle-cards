/**
 * Prophet random starting specials — rules spec §4, #V4-27, backlog L27-04.
 */

import { getKit, SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { dealStartingLoadout } from '../reanimate-player';

describe('Prophet kit (L27-04 / #V4-27)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog resources; specialCards empty; random count 2', () => {
    const kit = getKit('prophet');
    expect(kit.startingResources).toEqual({
      lives: 10,
      points: 4,
      upgradePoints: 2,
      draw: 1,
    });
    expect(kit.startingCardCounts).toEqual({ action: 5, attack: 2 });
    expect(kit.specialCards).toEqual([]);
    expect(kit.randomStartingSpecialCount).toBe(2);
    expect(kit.traits.alwaysUpgraded).toEqual([]);

    const state = createInitialState({
      seats,
      seed: 'prophet-catalog',
      kitAssignment: ['prophet', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'prophet');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(10);
    expect(player.points).toBe(4);
    expect(player.upgradePoints).toBe(2);
    expect(player.specialCards).toHaveLength(2);
    for (const card of player.specialCards) {
      expect(SPECIAL_CARD_IDS).toContain(card.cardId);
    }
  });

  it('draws via injected rng over all 20 specials (with replacement)', () => {
    const state = createInitialState({
      seats,
      seed: 'prophet-rng-pool',
      kitAssignment: ['prophet', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'prophet');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    const dealtIds = player.specialCards.map((c) => c.cardId);
    expect(dealtIds).toHaveLength(2);
    expect(SPECIAL_CARD_IDS).toContain(dealtIds[0]);
    expect(SPECIAL_CARD_IDS).toContain(dealtIds[1]);

    // Same seed → same two picks (reproducible).
    const again = createInitialState({
      seats,
      seed: 'prophet-rng-pool',
      kitAssignment: ['prophet', 'kamikaze'],
    });
    const againPlayer = again.players.find((p) => p.kitId === 'prophet');
    expect(againPlayer?.specialCards.map((c) => c.cardId)).toEqual(dealtIds);

    // Force-deal also consumes only the injected rng.
    player.hand = [];
    player.specialCards = [];
    dealStartingLoadout(player, 'prophet', createRng('prophet-forced-dupes'), 'forced');
    expect(player.specialCards).toHaveLength(2);
    expect(SPECIAL_CARD_IDS).toContain(player.specialCards[0]?.cardId);
    expect(SPECIAL_CARD_IDS).toContain(player.specialCards[1]?.cardId);
  });

  it('allows duplicate specials when rng picks the same id twice', () => {
    // Exhaustive check: with replacement, some seed yields a duplicate pair.
    let foundDuplicate = false;

    for (let i = 0; i < 500; i += 1) {
      const state = createInitialState({
        seats,
        seed: `prophet-dupe-hunt-${String(i)}`,
        kitAssignment: ['prophet', 'kamikaze'],
      });
      const player = state.players.find((p) => p.kitId === 'prophet');
      if (player === undefined) {
        continue;
      }
      const first = player.specialCards[0];
      const second = player.specialCards[1];
      if (first === undefined || second === undefined) {
        continue;
      }
      if (first.cardId === second.cardId) {
        foundDuplicate = true;
        expect(first.instanceId).not.toBe(second.instanceId);
        break;
      }
    }

    expect(foundDuplicate).toBe(true);
  });
});
