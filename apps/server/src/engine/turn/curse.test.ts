/**
 * Curse — rules spec §5, backlog L32-01 (victim-owned + transfer), #V4-20 spend math.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { queueEffect } from './queue-effect';
import { applyPersistentEffects } from './apply-persistent-effects';
import { eliminateWithoutReward } from './elimination-rewards';
import { performTurnAction } from './perform-action';
import { resolvePendingEffects } from './resolve-pending';

describe('Curse (L32-01)', () => {
  it('7 points spent costs 2 lives base; remainder discarded', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-7pts',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 7;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(8);
    expect(b.activePersistentEffects).toHaveLength(1);
  });

  it('upgraded costs 1 life per 2 points spent', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-up',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 5;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(8);
  });

  it('theft-only point loss does not trigger Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-theft',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 0;
    b.turnLedger.pointsLostToTheft = 9;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(10);
  });

  it('two stacked base Curses each tick on the same pointsSpent', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-stack',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
      makeCounterEffect({
        id: 'curse-2',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 6;

    applyPersistentEffects(state, b.id);
    // Each Curse: floor(6/3) = 2 → 4 lives total.
    expect(b.lives).toBe(6);
    expect(b.activePersistentEffects).toHaveLength(2);
  });

  it('victim at 2 spending 6 ends at 1 and Curse is permanently pooled', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-floor',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 2;
    b.turnLedger.pointsSpent = 6;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(1);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('victim already at 1 deactivates Curse without further loss', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-at1',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 1;
    b.turnLedger.pointsSpent = 99;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(1);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('activates via playCard on the cursed seat, not the caster', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-play',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'curse-1', cardId: 'curse', isUpgraded: false }];
    a.points = 8;
    a.pendingEffects = [];
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'curse-1',
        targetPlayerId: 'b',
      }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(b.activePersistentEffects[0]?.cardId).toBe('curse');
    expect(b.activePersistentEffects[0]?.counter).toBeNull();
    expect(b.activePersistentEffects[0]?.targetPlayerId).toBeNull();
  });

  it('successful attack dealing life transfers all Curses to the hit player', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-xfer',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
      makeCounterEffect({
        id: 'curse-2',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: a.id,
      targetPlayerId: b.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const resolved = resolvePendingEffects(state, b.id, createRng('l32-01-xfer'));
    expect(resolved[0]?.livesLost).toBeGreaterThanOrEqual(1);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(b.activePersistentEffects.map((effect) => effect.cardId)).toEqual([
      'curse',
      'curse',
    ]);
    expect(resolved[0]?.curseTransfers).toHaveLength(2);
    expect(resolved[0]?.curseTransfers?.[0]?.fromPlayerId).toBe('a');
    expect(resolved[0]?.curseTransfers?.[0]?.toPlayerId).toBe('b');
  });

  it('full shield absorb does not transfer Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-shield',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 10;
    b.shield = 5;
    b.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: a.id,
      targetPlayerId: b.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const resolved = resolvePendingEffects(state, b.id, createRng('l32-01-shield'));
    expect(resolved[0]?.livesLost).toBe(0);
    expect(a.activePersistentEffects).toHaveLength(1);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(resolved[0]?.curseTransfers).toBeUndefined();
  });

  it('elimination of a cursed player pools their Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-01-elim',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
      }),
    ];
    b.lives = 5;

    eliminateWithoutReward(state, b.id);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });
});
