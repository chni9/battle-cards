/**
 * Upgrader per-kit UP economy — rules spec §4, #V4-28, backlog L27-01.
 */

import { UPGRADE_POINT_ECONOMY } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  buyUpgradePoint,
  sellUpgradePoint,
  upgradePointBuyCost,
  upgradePointSellYield,
} from '../economy/upgrade-points';
import { listLegalEconomyActions } from './list-legal-economy';

describe('Upgrader upgrade-point economy (L27-01 / #V4-28)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog resources and specials', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrader-catalog',
      kitAssignment: ['upgrader', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'upgrader');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(10);
    expect(player.points).toBe(0);
    expect(player.upgradePoints).toBe(3);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['upgrade-point-thief']);
    expect(upgradePointBuyCost('upgrader')).toBe(5);
    expect(upgradePointSellYield('upgrader')).toBe(7);
  });

  it('buys an upgrade point for 5 and sells for 7', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrader-buy-sell',
      kitAssignment: ['upgrader', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'upgrader');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 5;
    actor.upgradePoints = 0;

    expect(buyUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.points).toBe(0);
    expect(actor.upgradePoints).toBe(1);
    expect(actor.turnLedger.pointsSpent).toBe(5);

    expect(sellUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.upgradePoints).toBe(0);
    expect(actor.points).toBe(7);
  });

  it('leaves non-Upgrader buy/sell at the global 10 / 7', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrader-non-override',
      kitAssignment: ['untouchable', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'untouchable');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    expect(upgradePointBuyCost(actor.kitId)).toBe(UPGRADE_POINT_ECONOMY.buyCostPoints);
    expect(upgradePointSellYield(actor.kitId)).toBe(UPGRADE_POINT_ECONOMY.sellYieldPoints);

    actor.points = 10;
    actor.upgradePoints = 0;
    expect(buyUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.points).toBe(0);
    expect(actor.upgradePoints).toBe(1);

    expect(sellUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.points).toBe(7);
  });

  it('gates buyUpgradePoint on the per-kit cost in listLegalEconomyActions', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrader-legal-gate',
      kitAssignment: ['upgrader', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'upgrader');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 5;
    actor.hand = [];
    actor.specialCards = [];
    actor.upgradePoints = 0;

    const legal = listLegalEconomyActions(actor);
    expect(legal.some((a) => a.type === 'buyUpgradePoint')).toBe(true);

    actor.points = 4;
    expect(listLegalEconomyActions(actor).some((a) => a.type === 'buyUpgradePoint')).toBe(
      false,
    );
  });

  it('applies Upgrader prices after Cloning mutates kitId mid-game', () => {
    const state = createInitialState({
      seats,
      seed: 'upgrader-clone-mid',
      kitAssignment: ['untouchable', 'upgrader'],
    });
    const actor = state.players.find((p) => p.kitId === 'untouchable');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    // Cloning mutates kitId; economy must re-read getKit (never cache).
    actor.kitId = 'upgrader';
    actor.points = 5;
    actor.upgradePoints = 0;

    expect(buyUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.points).toBe(0);
    expect(actor.upgradePoints).toBe(1);

    expect(sellUpgradePoint(state, actor.id).ok).toBe(true);
    expect(actor.points).toBe(7);
  });
});
