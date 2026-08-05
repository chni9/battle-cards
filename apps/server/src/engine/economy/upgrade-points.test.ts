import { UPGRADE_POINT_ECONOMY } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { buyUpgradePoint, sellUpgradePoint } from './upgrade-points';

describe('upgrade points (rules spec §1, L2-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function actor() {
    const state = createInitialState({
      seats,
      seed: 'up-seed',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const id = state.currentTurnPlayerId;

    if (id === null) {
      throw new Error('no actor');
    }

    const player = state.players.find((entry) => entry.id === id);

    if (player === undefined) {
      throw new Error('missing player');
    }

    return { state, player };
  }

  it('buys one upgrade point for the configured cost', () => {
    const { state, player } = actor();
    player.points = UPGRADE_POINT_ECONOMY.buyCostPoints;

    const result = buyUpgradePoint(state, player.id);

    expect(result.ok).toBe(true);
    expect(player.points).toBe(0);
    expect(player.upgradePoints).toBe(1);
    expect(player.turnLedger.pointsSpent).toBe(UPGRADE_POINT_ECONOMY.buyCostPoints);
  });

  it('rejects buy when points are insufficient', () => {
    const { state, player } = actor();
    player.points = UPGRADE_POINT_ECONOMY.buyCostPoints - 1;

    expect(buyUpgradePoint(state, player.id).ok).toBe(false);
    expect(player.upgradePoints).toBe(0);
  });

  it('resells one upgrade point for the configured yield', () => {
    const { state, player } = actor();
    player.upgradePoints = 1;
    player.points = 0;

    const result = sellUpgradePoint(state, player.id);

    expect(result.ok).toBe(true);
    expect(player.upgradePoints).toBe(0);
    expect(player.points).toBe(UPGRADE_POINT_ECONOMY.sellYieldPoints);
  });

  it('rejects sell with no upgrade points', () => {
    const { state, player } = actor();

    expect(sellUpgradePoint(state, player.id).ok).toBe(false);
  });
});
