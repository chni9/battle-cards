/**
 * Points Generator — rules spec §5, backlog L5-08.
 */

import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Points Generator (L5-08)', () => {
  it('gains on the user turn including the play turn; stops when counter is gone', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-08',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'pg-1', cardId: 'points-generator', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'pg-1' }).ok,
    ).toBe(true);
    // Paid 5, then step 4 grants +2 on the play turn.
    expect(a.points).toBe(2);
    expect(a.activePersistentEffects[0]?.counter).toBe(3);

    a.activePersistentEffects = [];
    state.currentTurnPlayerId = a.id;
    a.points = 0;
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(a.points).toBe(getKit(a.kitId).startingResources.draw);
  });
});
