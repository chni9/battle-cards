/**
 * Indestructible alwaysUpgraded on Tax / Regeneration — rules spec §4, backlog L27-03.
 */

import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';

describe('Indestructible alwaysUpgraded (L27-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog resources and specials', () => {
    const state = createInitialState({
      seats,
      seed: 'indestructible-catalog',
      kitAssignment: ['indestructible', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'indestructible');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(18);
    expect(player.points).toBe(0);
    expect(player.upgradePoints).toBe(0);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['super-regeneration']);
    const traitCards = player.hand.filter(
      (c) => c.cardId === 'tax' || c.cardId === 'regeneration',
    );
    expect(traitCards.every((c) => c.isUpgraded)).toBe(true);
  });

  it('Tax bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'indestructible-tax-buy',
      kitAssignment: ['indestructible', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'indestructible');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'tax');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });

  it('Regeneration bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'indestructible-regen-buy',
      kitAssignment: ['indestructible', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'indestructible');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'regeneration');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });
});
