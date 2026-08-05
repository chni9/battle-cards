/**
 * Upgraded Reanimation kit pick — #V4-13 / L26-02.
 */

import { KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import {
  applyDefaultEliminationRewards,
  findSoleSurvivorId,
} from './elimination-rewards';
import {
  completeReanimationKitPick,
  expireReanimationKitPick,
  performTurnAction,
} from './perform-action';

describe('Reanimation upgraded kit pick (L26-02)', () => {
  function setupUpgradedPending(): ReturnType<typeof createInitialState> {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l26-02-kit',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    b.lives = 1;
    b.activePersistentEffects = [
      {
        id: 'reanim-up',
        cardId: 'reanimation',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
      },
    ];
    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.pendingReanimation).toEqual({ isUpgraded: true });
    expect(applyDefaultEliminationRewards(state).ok).toBe(true);
    expect(state.subChoice?.kind).toBe('reanimation-kit');
    expect(b.isEliminated).toBe(true);
    expect(findSoleSurvivorId(state)).toBeNull();
    return state;
  }

  it('raises reanimation-kit after rewards and applies the chosen kit', () => {
    const state = setupUpgradedPending();
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined || state.subChoice?.kind !== 'reanimation-kit') {
      throw new Error('missing kit pick');
    }

    expect(state.subChoice.eligibleKitIds).toEqual([...KIT_IDS]);
    const chosen = 'untouchable' as const;

    const result = completeReanimationKitPick(state, b.id, chosen);
    expect(result.ok).toBe(true);
    expect(state.subChoice).toBeNull();
    expect(b.isEliminated).toBe(false);
    expect(b.kitId).toBe(chosen);
    expect(b.pendingReanimation).toBeNull();
  });

  it('defaults to a seeded random kit on expiry', () => {
    const state = setupUpgradedPending();
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      throw new Error('missing b');
    }

    const result = expireReanimationKitPick(
      state,
      createRng('l26-02-expiry'),
    );
    expect(result.ok).toBe(true);
    expect(state.subChoice).toBeNull();
    expect(b.isEliminated).toBe(false);
    expect((KIT_IDS as readonly string[]).includes(b.kitId)).toBe(true);
  });

  it('pauses turn advance while the kit pick is open', () => {
    const state = setupUpgradedPending();
    expect(state.currentTurnPlayerId).not.toBeNull();
    // Rewards finished but kit pick holds — resumeAfterRewards must not have advanced
    // past a sole-survivor game-over.
    expect(findSoleSurvivorId(state)).toBeNull();
    expect(state.subChoice?.kind).toBe('reanimation-kit');
  });
});
