/**
 * Roulette — rules spec §5, designer 2026-09-20 / Lot 63 / L63-02.
 */

import {
  CIRCULATING_SPECIAL_CARD_IDS,
  PURCHASABLE_SPECIAL_CARD_IDS,
  SHARED_CARD_IDS,
  TRANSFORM_RESULT_SPECIAL_IDS,
  getKit,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCounterEffect, scriptedRng } from '../../testing/factories';
import { buySpecialCard, SPECIAL_CARD_PURCHASE_COST } from '../economy/buy-special-card';
import { createInitialState } from '../create-initial-state';
import { dealStartingLoadout } from '../reanimate-player';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

const ROULETTE_GRANT_SPECIAL_IDS = CIRCULATING_SPECIAL_CARD_IDS.filter(
  (id) => id !== 'roulette',
);

describe('Roulette (L63-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('pays 10, arms counter 2, and grants on the activation turn', () => {
    const state = createInitialState({
      seats,
      seed: 'l63-02-roulette-play',
      kitAssignment: ['untouchable', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.id === 'a');
    const other = state.players.find((player) => player.id === 'b');
    if (actor === undefined || other === undefined) {
      throw new Error('missing players');
    }

    actor.specialCards = [{ instanceId: 'fac-1', cardId: 'roulette', isUpgraded: false }];
    actor.hand = [];
    actor.points = 10;
    actor.pendingEffects = [];
    other.pendingEffects = [];
    state.currentTurnPlayerId = actor.id;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'fac-1',
    });
    expect(result.ok).toBe(true);
    expect(actor.points).toBe(0);
    expect(actor.activePersistentEffects).toHaveLength(1);
    expect(actor.activePersistentEffects[0]?.cardId).toBe('roulette');
    expect(actor.activePersistentEffects[0]?.counter).toBe(2);
    expect(actor.specialCards.find((card) => card.instanceId === 'fac-1')).toBeUndefined();
    expect(actor.hand.length + actor.specialCards.length).toBe(1);
  });

  it('base grant is only a shared card, never a special, with 10% upgraded copy', () => {
    const state = createInitialState({
      seats,
      seed: 'l63-02-roulette-8020',
    });
    const owner = state.players.find((player) => player.id === 'a');
    if (owner === undefined) {
      throw new Error('missing owner');
    }

    owner.hand = [];
    owner.specialCards = [];
    owner.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-base', cardId: 'roulette', counter: 2, isUpgraded: false }),
    ];

    applyPersistentEffects(state, owner.id, scriptedRng([8, 1]));
    expect(owner.hand).toHaveLength(1);
    expect(owner.hand[0]?.cardId).toBe(SHARED_CARD_IDS[8]);
    expect(owner.specialCards).toHaveLength(0);
    expect(owner.hand[0]?.isUpgraded).toBe(false);

    owner.hand = [];
    applyPersistentEffects(state, owner.id, scriptedRng([0, 0]));
    expect(owner.hand[0]?.cardId).toBe(SHARED_CARD_IDS[0]);
    expect(owner.hand[0]?.isUpgraded).toBe(true);
    expect(owner.specialCards).toHaveLength(0);
  });

  it('upgraded grant is 80/20 plus an independent 10% upgraded copy', () => {
    const state = createInitialState({
      seats,
      seed: 'l63-02-roulette-up',
    });
    const owner = state.players.find((player) => player.id === 'a');
    if (owner === undefined) {
      throw new Error('missing owner');
    }

    owner.hand = [];
    owner.specialCards = [];
    owner.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-up', cardId: 'roulette', counter: 2, isUpgraded: true }),
    ];

    applyPersistentEffects(state, owner.id, scriptedRng([0, 0, 0]));
    expect(owner.hand[0]?.cardId).toBe(SHARED_CARD_IDS[0]);
    expect(owner.hand[0]?.isUpgraded).toBe(true);

    owner.hand = [];
    applyPersistentEffects(state, owner.id, scriptedRng([7, 2, 1]));
    expect(owner.hand[0]?.cardId).toBe(SHARED_CARD_IDS[2]);
    expect(owner.hand[0]?.isUpgraded).toBe(false);

    owner.hand = [];
    owner.specialCards = [];
    applyPersistentEffects(state, owner.id, scriptedRng([8, 0, 0]));
    expect(owner.hand).toHaveLength(0);
    expect(owner.specialCards[0]?.cardId).toBe(ROULETTE_GRANT_SPECIAL_IDS[0]);
    expect(owner.specialCards[0]?.isUpgraded).toBe(true);
    expect(owner.specialCards[0]?.cardId).not.toBe('roulette');

    owner.specialCards = [];
    applyPersistentEffects(state, owner.id, scriptedRng([8, 0, 1]));
    expect(owner.specialCards[0]?.isUpgraded).toBe(false);
  });

  it('never grants Roulette from its own special pool', () => {
    expect(ROULETTE_GRANT_SPECIAL_IDS).not.toContain('roulette');
    expect(ROULETTE_GRANT_SPECIAL_IDS).toHaveLength(CIRCULATING_SPECIAL_CARD_IDS.length - 1);

    const state = createInitialState({ seats, seed: 'l63-02-roulette-no-self' });
    const owner = state.players.find((player) => player.id === 'a');
    if (owner === undefined) {
      throw new Error('missing owner');
    }

    owner.hand = [];
    owner.specialCards = [];
    owner.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-pool', cardId: 'roulette', counter: 2, isUpgraded: true }),
    ];

    for (let index = 0; index < ROULETTE_GRANT_SPECIAL_IDS.length; index += 1) {
      owner.specialCards = [];
      applyPersistentEffects(state, owner.id, scriptedRng([8, index, 1]));
      expect(owner.specialCards[0]?.cardId).toBe(ROULETTE_GRANT_SPECIAL_IDS[index]);
      expect(owner.specialCards[0]?.cardId).not.toBe('roulette');
    }
  });

  it('ticks independently for each armed Roulette', () => {
    const state = createInitialState({ seats, seed: 'l63-02-roulette-multi' });
    const owner = state.players.find((player) => player.id === 'a');
    if (owner === undefined) {
      throw new Error('missing owner');
    }

    owner.hand = [];
    owner.specialCards = [];
    owner.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-a', cardId: 'roulette', counter: 2 }),
      makeCounterEffect({ id: 'fac-b', cardId: 'roulette', counter: 2 }),
    ];

    applyPersistentEffects(state, owner.id, scriptedRng([0, 1, 1, 1]));
    expect(owner.hand.map((card) => card.cardId)).toEqual([
      SHARED_CARD_IDS[0],
      SHARED_CARD_IDS[1],
    ]);
  });

  it('attack damage decrements the Roulette counter; Tax does not', () => {
    const state = createInitialState({
      seats,
      seed: 'l63-02-roulette-lives',
      kitAssignment: ['untouchable', 'kamikaze'],
    });
    const attacker = state.players.find((player) => player.id === 'a');
    const defender = state.players.find((player) => player.id === 'b');
    if (attacker === undefined || defender === undefined) {
      throw new Error('missing players');
    }

    defender.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-live', cardId: 'roulette', counter: 2 }),
    ];
    defender.lives = 10;
    defender.shield = 0;
    defender.pendingEffects = [];
    attacker.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    attacker.points = 1;
    attacker.pendingEffects = [];
    state.currentTurnPlayerId = attacker.id;

    expect(
      performTurnAction(state, attacker.id, {
        type: 'playCard',
        instanceId: 'atk-1',
        targetPlayerId: defender.id,
      }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = defender.id;
    defender.points = 1;
    const resolve = performTurnAction(state, defender.id, { type: 'draw' });
    expect(resolve.ok).toBe(true);
    expect(defender.activePersistentEffects[0]?.cardId).toBe('roulette');
    expect(defender.activePersistentEffects[0]?.counter).toBe(1);

    const taxState = createInitialState({
      seats,
      seed: 'l63-02-roulette-tax',
      kitAssignment: ['untouchable', 'kamikaze'],
    });
    const actor = taxState.players.find((player) => player.id === 'a');
    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.activePersistentEffects = [
      makeCounterEffect({ id: 'fac-tax', cardId: 'roulette', counter: 2 }),
    ];
    actor.lives = 5;
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    actor.pendingEffects = [];
    taxState.currentTurnPlayerId = actor.id;

    expect(
      performTurnAction(taxState, actor.id, { type: 'playCard', instanceId: 'tax-1' }).ok,
    ).toBe(true);
    expect(actor.activePersistentEffects[0]?.counter).toBe(2);
  });

  it('shop, Transformer, and Prophet can mint Roulette', () => {
    expect(PURCHASABLE_SPECIAL_CARD_IDS).toContain('roulette');
    expect(TRANSFORM_RESULT_SPECIAL_IDS).toContain('roulette');
    expect(getKit('prophet').randomStartingSpecialCount).toBe(2);
    expect(CIRCULATING_SPECIAL_CARD_IDS).toContain('roulette');

    const shopState = createInitialState({ seats, seed: 'l63-02-shop-roulette' });
    const buyer = shopState.players.find((player) => player.id === 'a');
    if (buyer === undefined) {
      throw new Error('missing buyer');
    }

    buyer.points = SPECIAL_CARD_PURCHASE_COST;
    buyer.specialCards = [];
    const rouletteIndex = PURCHASABLE_SPECIAL_CARD_IDS.indexOf('roulette');
    expect(rouletteIndex).toBeGreaterThanOrEqual(0);
    const bought = buySpecialCard(shopState, buyer.id, scriptedRng([rouletteIndex]));
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }
    expect(bought.instance.cardId).toBe('roulette');

    const prophet = createInitialState({
      seats,
      seed: 'l63-02-prophet-roulette',
      kitAssignment: ['prophet', 'kamikaze'],
    }).players.find((player) => player.kitId === 'prophet');
    if (prophet === undefined) {
      throw new Error('missing prophet');
    }

    prophet.hand = [];
    prophet.specialCards = [];
    let pickCount = 0;
    dealStartingLoadout(
      prophet,
      'prophet',
      {
        nextInt: (maxExclusive: number): number => {
          if (maxExclusive <= 0) {
            throw new RangeError('nextInt bound');
          }
          return 0;
        },
        pick: <T>(items: readonly T[]): T => {
          pickCount += 1;
          // Prophet: 5 actions, 2 attacks, then 2 specials.
          if (pickCount > 7) {
            const roulette = items.find((item) => item === 'roulette');
            if (roulette !== undefined) {
              return roulette;
            }
          }
          const first = items[0];
          if (first === undefined) {
            throw new RangeError('empty pick');
          }
          return first;
        },
        shuffle: <T>(items: readonly T[]): T[] => [...items],
      },
      'prophet-roulette',
    );
    expect(prophet.specialCards.map((card) => card.cardId)).toEqual(['roulette', 'roulette']);
  });
});
