import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { upgradeCard } from './upgrade-card';

describe('upgradeCard (rules spec §1, L2-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('upgrades only the targeted copy', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrade-seed',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 1;
    const first = actor.hand[0];
    const second = actor.hand[1];

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    if (first === undefined || second === undefined) {
      return;
    }

    const result = upgradeCard(state, actorId, first.instanceId);

    expect(result.ok).toBe(true);
    expect(first.isUpgraded).toBe(true);
    expect(second.isUpgraded).toBe(false);
    expect(actor.upgradePoints).toBe(0);
    expect(actor.turnLedger.upgradePointsSpent).toBe(1);
  });

  it('rejects when already upgraded or no upgrade points', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrade-reject',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const actorId = state.currentTurnPlayerId;

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    if (actor === undefined) {
      return;
    }

    const copy = actor.hand[0];

    if (copy === undefined) {
      return;
    }

    expect(upgradeCard(state, actorId, copy.instanceId).ok).toBe(false);

    actor.upgradePoints = 1;
    copy.isUpgraded = true;
    expect(upgradeCard(state, actorId, copy.instanceId).ok).toBe(false);
    expect(actor.upgradePoints).toBe(1);
  });

  it('upgrades an active poison without resetting its counter and rejects curse', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrade-active',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const actor = state.players[0];

    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 1;
    actor.activePersistentEffects = [
      {
        id: 'poison-1',
        cardId: 'poison',
        isUpgraded: false,
        counter: 3,
        targetPlayerId: null,
      },
      {
        id: 'curse-1',
        cardId: 'curse',
        isUpgraded: false,
        counter: null,
        targetPlayerId: null,
      },
    ];

    expect(upgradeCard(state, actor.id, 'curse-1').ok).toBe(false);
    expect(actor.upgradePoints).toBe(1);

    const upgraded = upgradeCard(state, actor.id, 'poison-1');
    expect(upgraded).toEqual({ ok: true, cardId: 'poison' });
    expect(actor.activePersistentEffects[0]?.isUpgraded).toBe(true);
    expect(actor.activePersistentEffects[0]?.counter).toBe(3);
    expect(actor.upgradePoints).toBe(0);
  });

  it('flips a ticking Sentence without resetting remaining turns', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrade-sentence',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const actor = state.players[0];

    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 1;
    state.pendingSentences = [
      {
        id: 'sentence:1:a:0',
        sourcePlayerId: actor.id,
        remainingOwnerTurns: 2,
        isUpgraded: false,
      },
    ];

    expect(upgradeCard(state, actor.id, 'sentence:1:a:0')).toEqual({
      ok: true,
      cardId: 'sentence',
    });
    expect(state.pendingSentences[0]?.isUpgraded).toBe(true);
    expect(state.pendingSentences[0]?.remainingOwnerTurns).toBe(2);
    expect(actor.upgradePoints).toBe(0);
  });

  it('upgrades an active shield without changing remaining points', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrade-shield',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const actor = state.players[0];

    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 1;
    actor.shield = 3;
    actor.shieldIsUpgraded = false;

    expect(upgradeCard(state, actor.id, 'active-shield')).toEqual({
      ok: true,
      cardId: 'shield',
    });
    expect(actor.shield).toBe(3);
    expect(actor.shieldIsUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(0);
    expect(upgradeCard(state, actor.id, 'active-shield').ok).toBe(false);
  });
});
