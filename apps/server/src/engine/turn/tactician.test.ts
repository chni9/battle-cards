/**
 * Tactician kit — rules spec §4, #V4-25, backlog L27-02.
 *
 * Inactivity / absence auto-draw uses `{ type: 'draw' }` (game-room
 * `performAutoDraw`), so it grants the kit's draw value (4) — same path as a
 * deliberate draw. Accepted for V4; measurement target for L31-02.
 */

import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Tactician kit (L27-02 / #V4-25)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog value by value', () => {
    const kit = getKit('tactician');
    expect(kit.startingResources).toEqual({
      lives: 1,
      points: 15,
      upgradePoints: 0,
      draw: 4,
    });
    expect(kit.startingCardCounts).toEqual({ action: 2, attack: 2 });
    expect(kit.traits.alwaysUpgraded).toEqual(['spy', 'thief', 'mirror']);
    expect(kit.specialCards).toEqual(['block']);

    const state = createInitialState({
      seats,
      seed: 'tactician-catalog',
      kitAssignment: ['tactician', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'tactician');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(1);
    expect(player.points).toBe(15);
    expect(player.upgradePoints).toBe(0);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['block']);
    const traitCards = player.hand.filter(
      (c) => c.cardId === 'spy' || c.cardId === 'thief' || c.cardId === 'mirror',
    );
    expect(traitCards.every((c) => c.isUpgraded)).toBe(true);
  });

  it('draw action grants 4 points (same path inactivity auto-draw uses)', () => {
    const state = createInitialState({
      seats,
      seed: 'tactician-draw-4',
      kitAssignment: ['tactician', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'tactician');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    // Ensure it is the Tactician's turn.
    state.currentTurnPlayerId = actor.id;
    actor.points = 0;

    const result = performTurnAction(state, actor.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    expect(actor.points).toBe(4);
  });

  it('Spy bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'tactician-spy-buy',
      kitAssignment: ['tactician', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'tactician');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'spy');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });
});
