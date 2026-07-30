/**
 * Cloning — rules spec §5, backlog L5-06.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Cloning (L5-06)', () => {
  it('wipes visibility both ways and clears incoming pending effects', () => {
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

    a.specialCards = [{ instanceId: 'cl-1', cardId: 'cloning', isUpgraded: false }];
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
      },
    ];
    b.kitId = 'scientific';
    b.lives = 12;
    b.points = 4;
    b.upgradePoints = 1;
    b.hand = [{ instanceId: 'h1', cardId: 'spy', isUpgraded: true }];
    b.specialCards = [{ instanceId: 's1', cardId: 'cloning', isUpgraded: false }];
    b.activePersistentEffects = [
      { id: 'pg', cardId: 'points-generator', isUpgraded: false, counter: 2 },
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
    expect(a.points).toBe(6); // cloned 4 + Points Generator tick +2
    expect(a.pendingEffects).toHaveLength(0);
    expect(b.pendingEffects).toHaveLength(1);
    expect(a.activePersistentEffects).toHaveLength(1);
    expect(a.activePersistentEffects[0]?.id).not.toBe('pg');
    expect(a.hand[0]?.instanceId).not.toBe('h1');
    expect(state.visibility).toHaveLength(0);
  });
});
