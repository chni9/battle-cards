/**
 * Invisibility — rules spec §5, backlog L25-02, #V4-9 / #V4-10.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { decide } from '../../bots/heuristic-policy';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { applyPersistentEffects } from './apply-persistent-effects';
import { eliminateWithoutReward } from './elimination-rewards';
import { listLegalActions } from './list-legal-actions';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';
import { resolvePendingEffects } from './resolve-pending';

describe('Invisibility (L25-02)', () => {
  it('gains 4 points per own turn while active (+6 upgraded)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-pts',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'inv-1',
        cardId: 'invisibility',
        counter: null,
        isUpgraded: false,
      }),
    ];
    a.points = 0;
    applyPersistentEffects(state, a.id);
    expect(a.points).toBe(4);

    a.activePersistentEffects[0] = makeCounterEffect({
      id: 'inv-1',
      cardId: 'invisibility',
      counter: null,
      isUpgraded: true,
    });
    a.points = 0;
    applyPersistentEffects(state, a.id);
    expect(a.points).toBe(6);
  });

  it('skips Poison/Curse/Imposition ticks while invisible and resumes after deactivate (#V4-9a)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-9a',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'inv-1',
        cardId: 'invisibility',
        counter: null,
      }),
    ];
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'poison-1',
        cardId: 'poison',
        counter: 3,
      }),
    ];
    a.lives = 10;
    applyPersistentEffects(state, a.id);
    expect(a.lives).toBe(10);
    expect(b.activePersistentEffects).toHaveLength(1);

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'deactivatePersistent',
        effectId: 'inv-1',
      }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')).toBe(
      false,
    );
    // Deactivate turn already ran applyPersistentEffects after the action — Poison ticks once.
    expect(a.lives).toBe(9);
  });

  it('resolves pending attacks as immune including MEGA (#V4-9b)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-9b',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    a.lives = 10;
    queueEffect({
      state,
      sourcePlayerId: b.id,
      targetPlayerId: a.id,
      cardId: 'mega-attack',
      isUpgraded: false,
    });

    const resolved = resolvePendingEffects(state, a.id, createRng('l25-02-9b'));
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.outcome).toBe('immune');
    expect(a.lives).toBe(10);
  });

  it('excludes invisible players from Sentence candidates (#V4-9c)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-9c',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    state.currentTurnPlayerId = a.id;
    a.points = 20;
    a.specialCards = [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: true }];

    // Upgraded Sentence excludes self; only b remains and is invisible → not playable.
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'sent-1' }).ok,
    ).toBe(false);
    expect(a.specialCards).toHaveLength(1);
  });

  it('allows targeting an invisible player and resolves Cloning as immune (#V4-9d)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-9d',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    b.kitId = 'scientific';
    b.lives = 18;
    a.kitId = 'kamikaze';
    a.lives = 5;
    a.points = 20;
    a.specialCards = [{ instanceId: 'clone-1', cardId: 'cloning', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;

    const result = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'clone-1',
      targetPlayerId: b.id,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.resolved.some((entry) => entry.outcome === 'immune')).toBe(true);
    expect(a.kitId).toBe('kamikaze');
    expect(a.lives).toBe(5);
  });

  it('does not block lifecycle elimination while invisible', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-life',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    eliminateWithoutReward(state, a.id);
    expect(a.isEliminated).toBe(true);
  });

  it('deactivate consumes the turn action (#V4-10)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-10',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    state.currentTurnPlayerId = a.id;
    a.points = 20;
    a.specialCards = [{ instanceId: 'inv-card', cardId: 'invisibility', isUpgraded: false }];
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'inv-card' }).ok,
    ).toBe(true);

    const effectId = a.activePersistentEffects.find(
      (effect) => effect.cardId === 'invisibility',
    )?.id;

    if (effectId === undefined) {
      throw new Error('missing invisibility effect');
    }

    expect(state.currentTurnPlayerId).toBe('b');
    state.currentTurnPlayerId = a.id;
    const beforePool = state.pool.length;
    expect(
      performTurnAction(state, a.id, { type: 'deactivatePersistent', effectId }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')).toBe(
      false,
    );
    expect(state.pool.length).toBeGreaterThan(beforePool);
    expect(state.currentTurnPlayerId).toBe('b');
  });

  it('bot scoreAction handles deactivatePersistent without sellUpgradePoint fallback', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l25-02-bot',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: null }),
    ];
    a.upgradePoints = 0;
    state.currentTurnPlayerId = a.id;

    const view = buildPlayingViewFor({
      recipientSessionId: a.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const actions = listLegalActions(state, a.id);
    const decision = decide(view, actions, createRng('l25-02-bot'));
    expect(decision.type).not.toBe('sellUpgradePoint');
    expect(
      actions.some(
        (action) => action.type === 'deactivatePersistent' && action.effectId === 'inv-1',
      ),
    ).toBe(true);
  });
});
