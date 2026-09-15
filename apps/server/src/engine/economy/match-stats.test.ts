/**
 * Match-long recap totals — L60-03.
 * Spend is chosen spend, not theft. applyDamage and applyLifeLoss stay separate.
 */

import { CLASSIC_LIFE_LIMIT, CLEAR_SPY_COST } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCounterEffect, makePlayer } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyDamage } from '../life/apply-damage';
import { applyLifeLoss } from '../life/apply-life-loss';
import { gainLives } from '../life/gain-lives';
import { reanimatePlayer } from '../reanimate-player';
import { createRng } from '../rng';
import { gainPoints } from './gain-points';
import { stealPoints } from './steal-points';
import { payCost } from './transfers';
import { upgradeCard } from './upgrade-card';

describe('matchStats (L60-03)', () => {
  it('counts lives lost from applyDamage, not shield absorb', () => {
    const target = makePlayer({ lives: 10, shield: 4 });

    applyDamage(target, 7, 'super-attack');

    expect(target.matchStats.livesLost).toBe(3);
  });

  it('counts lives lost from applyLifeLoss on a separate path', () => {
    const target = makePlayer({ lives: 10, shield: 7 });

    applyLifeLoss(target, 1, 'tax');

    expect(target.matchStats.livesLost).toBe(1);
    expect(target.shield).toBe(7);
  });

  it('does not eat Invisibility remaining turns while still counting lives lost', () => {
    const effect = makeCounterEffect({
      id: 'inv-1',
      cardId: 'invisibility',
      counter: 4,
    });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    applyDamage(target, 3, 'super-attack');

    expect(target.matchStats.livesLost).toBe(3);
    expect(effect.counter).toBe(4);
  });

  it('counts post-cap lives gained only', () => {
    const target = makePlayer({ lives: 23 });

    gainLives(target, 4, CLASSIC_LIFE_LIMIT);

    expect(target.matchStats.livesGained).toBe(2);
  });

  it('counts points gained including theft receipts', () => {
    const thief = makePlayer({ id: 'thief', points: 0 });

    gainPoints(thief, 10, 'direct');

    expect(thief.matchStats.pointsGained).toBe(10);
    expect(thief.matchStats.pointsSpent).toBe(0);
  });

  it('counts payCost as chosen spend, including Unspy', () => {
    const player = makePlayer({ points: 20 });
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l59-03-pay',
    });

    const paid = payCost(state, player, { points: CLEAR_SPY_COST });

    expect(paid.ok).toBe(true);
    expect(player.matchStats.pointsSpent).toBe(CLEAR_SPY_COST);
    expect(player.turnLedger.pointsSpent).toBe(CLEAR_SPY_COST);
  });

  it('does not count theft as pointsSpent on the victim', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l59-03-steal',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    b.points = 12;
    stealPoints({
      state,
      sourcePlayerId: a.id,
      targetPlayerId: b.id,
      amount: 10,
      gainMultiplier: 1,
    });

    expect(b.matchStats.pointsSpent).toBe(0);
    expect(b.turnLedger.pointsLostToTheft).toBe(10);
    expect(a.matchStats.pointsGained).toBe(10);
  });

  it('counts upgrade-card spend on matchStats', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l59-03-up',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.upgradePoints = 1;
    a.hand = [{ instanceId: 'c1', cardId: 'basic-attack', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;

    const result = upgradeCard(state, a.id, 'c1');

    expect(result.ok).toBe(true);
    expect(a.matchStats.upgradePointsSpent).toBe(1);
  });

  it('keeps matchStats across Reanimation while resetting the turn ledger', () => {
    const player = makePlayer({ lives: 4, points: 9 });
    applyLifeLoss(player, 2, 'tax');
    gainPoints(player, 5, 'direct');
    player.matchStats.pointsSpent = 8;

    reanimatePlayer(player, 'ghost', createRng('l59-03-reanim'));

    expect(player.matchStats.livesLost).toBe(2);
    expect(player.matchStats.pointsGained).toBe(5);
    expect(player.matchStats.pointsSpent).toBe(8);
    expect(player.turnLedger.livesLost).toBe(0);
    expect(player.turnLedger.pointsSpent).toBe(0);
  });
});
