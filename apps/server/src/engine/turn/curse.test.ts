/**
 * Curse — rules spec §5, designer 2026-08-24 siphon (L50-02).
 * Victim-owned + transfer (designer 2026-08-07) still apply.
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

describe('Curse (siphon to original caster, L50-02)', () => {
  it('points spent no longer drain the cursed player', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-no-spend',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.lives = 10;
    a.lives = 10;
    b.turnLedger.pointsSpent = 99;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(10);
    expect(a.lives).toBe(10);
    expect(b.activePersistentEffects).toHaveLength(1);
  });

  it('actual attack lives lost siphon 1:1 to the original caster', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l50-02-atk',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    b.lives = 10;
    b.shield = 0;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: c.id,
      targetPlayerId: b.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const resolved = resolvePendingEffects(state, b.id, createRng('l50-02-atk'));
    const lost = resolved[0]?.livesLost ?? 0;
    expect(lost).toBeGreaterThanOrEqual(1);
    expect(b.lives).toBe(10 - lost);
    expect(a.lives).toBe(10 + lost);
  });

  it('upgraded Curse grants 2 lives per life lost', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    a.specialCards = [];
    a.pendingEffects = [];
    b.lives = 10;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    b.points = 0;
    state.currentTurnPlayerId = b.id;

    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(b.lives).toBe(9);
    expect(a.lives).toBe(12);
  });

  it('each stacked copy pays independently', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l50-02-stack',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    c.lives = 10;
    b.lives = 10;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
      makeCounterEffect({
        id: 'curse-2',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: c.id,
      }),
    ];
    b.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = b.id;

    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(b.lives).toBe(9);
    expect(a.lives).toBe(11);
    expect(c.lives).toBe(12);
  });

  it('does not siphon when the Curse sits on its original caster', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-self',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing player');
    }

    a.lives = 10;
    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    a.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(a.lives).toBe(9);
  });

  it('skips siphon when the original caster is eliminated', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l50-02-dead',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 5;
    eliminateWithoutReward(state, a.id);
    b.lives = 10;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = b.id;

    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(b.lives).toBe(9);
    expect(a.lives).toBe(0);
  });

  it('clamps siphon gains to lifeLimit', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-cap',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = state.lifeLimit;
    b.lives = 10;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = b.id;

    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(a.lives).toBe(state.lifeLimit);
  });

  it('full shield absorb siphons nothing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l50-02-shield',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    b.lives = 10;
    b.shield = 5;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: c.id,
      targetPlayerId: b.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const resolved = resolvePendingEffects(state, b.id, createRng('l50-02-shield'));
    expect(resolved[0]?.livesLost).toBe(0);
    expect(a.lives).toBe(10);
    expect(b.lives).toBe(10);
  });

  it('victim already at 1 deactivates Curse without further loss', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-at1',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      throw new Error('missing player');
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: 'a',
      }),
    ];
    b.lives = 1;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(1);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('dropping to 1 life pools the Curse after siphoning that loss', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-floor',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    b.lives = 2;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: a.id,
      }),
    ];
    b.specialCards = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = b.id;

    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(b.lives).toBe(1);
    expect(a.lives).toBe(11);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('activates via playCard on the cursed seat and stores the original caster', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-play',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
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
    expect(b.activePersistentEffects[0]?.originalCasterPlayerId).toBe(a.id);
    expect(b.activePersistentEffects[0]?.targetPlayerId).toBeNull();
  });

  it('successful attack dealing life transfers all Curses and keeps the original caster', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-xfer',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: 'c',
      }),
      makeCounterEffect({
        id: 'curse-2',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: 'c',
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

    const resolved = resolvePendingEffects(state, b.id, createRng('l50-02-xfer'));
    expect(resolved[0]?.livesLost).toBeGreaterThanOrEqual(1);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(b.activePersistentEffects.map((effect) => effect.originalCasterPlayerId)).toEqual([
      'c',
      'c',
    ]);
    expect(resolved[0]?.curseTransfers).toHaveLength(2);
  });

  it('full shield absorb does not transfer Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l50-02-xfer-shield',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: 'c',
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

    const resolved = resolvePendingEffects(state, b.id, createRng('l50-02-xfer-shield'));
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
      seed: 'l50-02-elim',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      throw new Error('missing player');
    }

    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: null,
        originalCasterPlayerId: 'a',
      }),
    ];
    b.lives = 5;

    eliminateWithoutReward(state, b.id);
    expect(b.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });
});
