/**
 * Special card model — rules spec §5, backlog L5-01.
 *
 * Catalog + play cost + single-use consume + upgrade in the specials zone.
 * Do not re-deal kit specials (decisions.md L4→L5 handoff).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { upgradeCard } from '../economy/upgrade-card';
import { performTurnAction } from './perform-action';

describe('special card model (L5-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('pays Price, removes the special from the zone, and does not re-deal kits', () => {
    const state = createInitialState({ seats, seed: 'l5-01-consume' });
    const actor = state.players.find((player) => player.id === 'a');
    const opponent = state.players.find((player) => player.id === 'b');

    expect(actor).toBeDefined();
    expect(opponent).toBeDefined();

    if (actor === undefined || opponent === undefined) {
      return;
    }

    // Assassin starts with Points Generator — force both players to Assassin specials.
    actor.kitId = 'assassin';
    opponent.kitId = 'assassin';
    actor.specialCards = [
      { instanceId: 'pg-1', cardId: 'points-generator', isUpgraded: false },
    ];
    const specialsAtStart = actor.specialCards.length;

    state.currentTurnPlayerId = actor.id;
    actor.points = 5;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'pg-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.points).toBe(2); // paid 5, then Points Generator step-4 tick +2
    expect(actor.turnLedger.pointsSpent).toBe(5);
    expect(actor.specialCards).toHaveLength(0);
    expect(actor.activePersistentEffects).toHaveLength(1);
    expect(actor.activePersistentEffects[0]?.cardId).toBe('points-generator');
    expect(actor.activePersistentEffects[0]?.counter).toBe(3);
    // Instant specials join the pool; persistent ones stay active until deactivate.
    expect(state.pool.some((card) => card.instanceId === 'pg-1')).toBe(false);
    expect(specialsAtStart).toBe(1);
  });

  it('rejects play when the player cannot afford the special Price', () => {
    const state = createInitialState({ seats, seed: 'l5-01-cost' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.specialCards = [
      { instanceId: 'pg-1', cardId: 'points-generator', isUpgraded: false },
    ];
    state.currentTurnPlayerId = actor.id;
    actor.points = 4;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'pg-1',
    });

    expect(result.ok).toBe(false);
    expect(actor.specialCards).toHaveLength(1);
    expect(actor.points).toBe(4);
  });

  it('upgrades a copy in specialCards', () => {
    const state = createInitialState({ seats, seed: 'l5-01-upgrade' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 1;
    actor.specialCards = [
      { instanceId: 's-1', cardId: 'suicide', isUpgraded: false },
    ];

    const result = upgradeCard(state, actor.id, 's-1');

    expect(result.ok).toBe(true);
    expect(actor.specialCards[0]?.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(0);
    expect(actor.turnLedger.upgradePointsSpent).toBe(1);
  });

  it('pools an instant special on use (Imposition stays active, not pooled)', () => {
    const state = createInitialState({ seats, seed: 'l5-01-imposition' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.specialCards = [
      { instanceId: 'imp-1', cardId: 'imposition', isUpgraded: true },
    ];
    state.currentTurnPlayerId = actor.id;
    actor.points = 6;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'imp-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.specialCards).toHaveLength(0);
    expect(actor.activePersistentEffects[0]?.counter).toBe(2);
    expect(actor.activePersistentEffects[0]?.isUpgraded).toBe(true);
    expect(state.pool.some((card) => card.instanceId === 'imp-1')).toBe(false);
  });
});
