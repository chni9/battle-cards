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
});
