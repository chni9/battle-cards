/**
 * Cloning — rules spec §5 (kit + resources only; keep own cards).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Cloning (kit + resources only)', () => {
  it('copies kit and resources, keeps own cards, clears incoming pending, wipes visibility', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-06',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [
      { instanceId: 'cl-1', cardId: 'cloning', isUpgraded: false },
      { instanceId: 'own-special', cardId: 'suicide', isUpgraded: false },
    ];
    a.hand = [{ instanceId: 'own-hand', cardId: 'basic-attack', isUpgraded: true }];
    a.activePersistentEffects = [
      { id: 'own-pg', cardId: 'points-generator', isUpgraded: false, counter: 3 , targetPlayerId: null},
    ];
    a.points = 3;
    a.lives = 5;
    a.kitId = 'kamikaze';
    a.pendingEffects = [
      {
        id: 'atk',
        sourcePlayerId: 'b',
        targetPlayerId: 'a',
        cardId: 'basic-attack',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
      chosenInstanceId: null,
      },
    ];
    b.kitId = 'scientific';
    b.lives = 12;
    b.points = 4;
    b.upgradePoints = 1;
    b.shield = 4;
    b.shieldIsUpgraded = true;
    b.hand = [{ instanceId: 'h1', cardId: 'spy', isUpgraded: true }];
    b.specialCards = [{ instanceId: 's1', cardId: 'cloning', isUpgraded: false }];
    b.activePersistentEffects = [
      { id: 'pg', cardId: 'points-generator', isUpgraded: false, counter: 2 , targetPlayerId: null},
    ];
    b.pendingEffects = [
      {
        id: 'other',
        sourcePlayerId: 'a',
        targetPlayerId: 'b',
        cardId: 'thief',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
      chosenInstanceId: null,
      },
    ];
    state.visibility = [
      {
        viewerId: 'a',
        subjectId: 'b',
        level: 'kit-and-cards',
        resourcesSnapshot: {
          lives: 1,
          points: 1,
          upgradePoints: 0,
          shield: 0,
          turnSequence: 0,
        },
      },
      {
        viewerId: 'b',
        subjectId: 'a',
        level: 'full-resources',
      },
    ];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'cl-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);

    expect(a.kitId).toBe('scientific');
    expect(a.lives).toBe(12);
    expect(a.points).toBe(6); // cloned 4 + own Points Generator tick +2
    expect(a.upgradePoints).toBe(1);
    expect(a.shield).toBe(4);
    expect(a.shieldIsUpgraded).toBe(true);
    expect(a.pendingEffects).toHaveLength(0);
    expect(b.pendingEffects).toHaveLength(1);

    // Own cards and persistents kept (Cloning itself was spent).
    expect(a.hand).toEqual([{ instanceId: 'own-hand', cardId: 'basic-attack', isUpgraded: true }]);
    expect(a.specialCards).toEqual([
      { instanceId: 'own-special', cardId: 'suicide', isUpgraded: false },
    ]);
    expect(a.activePersistentEffects).toEqual([
      { id: 'own-pg', cardId: 'points-generator', isUpgraded: false, counter: 3 , targetPlayerId: null},
    ]);

    // Target cards untouched / not copied.
    expect(b.hand[0]?.instanceId).toBe('h1');
    expect(b.activePersistentEffects[0]?.id).toBe('pg');
    expect(state.visibility).toHaveLength(0);
  });
});
