/**
 * Card Transformer — rules spec §5, backlog L24-02 / #V4-16.
 */

import { TRANSFORM_RESULT_SPECIAL_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import {
  completeSpecialPick,
  performTurnAction,
} from './perform-action';

describe('Card Transformer (L24-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('rejects play with no eligible hand card', () => {
    const state = createInitialState({ seats, seed: 'l24-02-empty-hand' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [
      { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: false },
      { instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false },
    ];
    a.hand = [];
    a.points = 10;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        consumeInstanceId: 'mega-1',
      }).ok,
    ).toBe(false);
  });

  it('rejects MEGA ATTACK and specials as consume targets', () => {
    const state = createInitialState({ seats, seed: 'l24-02-mega' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [
      { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: false },
      { instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false },
    ];
    a.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: true }];
    a.points = 10;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        consumeInstanceId: 'mega-1',
      }).ok,
    ).toBe(false);
  });

  it('base: pools consumed card and grants a random special without inheriting upgrade', () => {
    const state = createInitialState({ seats, seed: 'l24-02-base' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.kitId = 'untouchable';
    a.specialCards = [
      { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: false },
      { instanceId: 'dup-poison', cardId: 'poison', isUpgraded: false },
    ];
    a.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: true }];
    a.points = 10;
    state.pool = [];
    state.currentTurnPlayerId = a.id;

    const beforeSpecialCount = a.specialCards.length;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        consumeInstanceId: 'tax-1',
      }).ok,
    ).toBe(true);

    expect(a.hand.find((card) => card.instanceId === 'tax-1')).toBeUndefined();
    expect(state.pool.some((card) => card.instanceId === 'tax-1' && card.isUpgraded)).toBe(
      true,
    );
    // Transformer consumed + one new special (may duplicate poison).
    expect(a.specialCards.length).toBe(beforeSpecialCount);
    const granted = a.specialCards.find((card) => card.instanceId !== 'dup-poison');
    expect(granted).toBeDefined();
    expect(granted?.isUpgraded).toBe(false);

    // Result is private to the user (`PlayingStateView.self`), not on public player slices.
    const aView = buildPlayingViewFor({
      recipientSessionId: a.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const bView = buildPlayingViewFor({
      recipientSessionId: b.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(aView.self.specialCards.some((card) => card.instanceId === granted?.instanceId)).toBe(
      true,
    );
    expect(bView.self.specialCards.some((card) => card.instanceId === granted?.instanceId)).toBe(
      false,
    );
  });

  it('upgraded: raises special-pick; complete grants chosen special (duplicates allowed)', () => {
    const state = createInitialState({ seats, seed: 'l24-02-upgraded' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [
      { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: true },
      { instanceId: 'poison-1', cardId: 'poison', isUpgraded: false },
    ];
    a.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    a.points = 10;
    state.currentTurnPlayerId = a.id;

    const play = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'ct-1',
      consumeInstanceId: 'atk-1',
    });
    expect(play.ok).toBe(true);

    if (!play.ok) {
      return;
    }

    expect(play.subChoicePending).toBe(true);
    expect(state.subChoice?.kind).toBe('special-pick');
    expect(state.pool.some((card) => card.instanceId === 'atk-1')).toBe(true);

    expect(completeSpecialPick(state, a.id, 'poison').ok).toBe(true);
    expect(a.specialCards.filter((card) => card.cardId === 'poison')).toHaveLength(2);
    expect(state.subChoice).toBeNull();
  });

  it('base never grants Card Transformer (L50-08)', () => {
    for (let index = 0; index < 40; index += 1) {
      const state = createInitialState({
        seats,
        seed: `l50-08-base-${String(index)}`,
      });
      const a = state.players.find((player) => player.id === 'a');

      if (a === undefined) {
        throw new Error('missing actor');
      }

      a.specialCards = [
        { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: false },
      ];
      a.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
      a.points = 10;
      state.currentTurnPlayerId = a.id;

      expect(
        performTurnAction(state, a.id, {
          type: 'playCard',
          instanceId: 'ct-1',
          consumeInstanceId: 'atk-1',
        }).ok,
      ).toBe(true);
      expect(a.specialCards).toHaveLength(1);
      const grantedId = a.specialCards[0]?.cardId;
      expect(grantedId).toBeDefined();
      expect(grantedId).not.toBe('card-transformer');
      expect((TRANSFORM_RESULT_SPECIAL_IDS as readonly string[]).includes(grantedId ?? '')).toBe(
        true,
      );
    }
  });

  it('upgraded special-pick excludes Card Transformer (L50-08)', () => {
    const state = createInitialState({ seats, seed: 'l50-08-pick' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [
      { instanceId: 'ct-1', cardId: 'card-transformer', isUpgraded: true },
    ];
    a.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    a.points = 10;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'ct-1',
        consumeInstanceId: 'atk-1',
      }).ok,
    ).toBe(true);
    expect(state.subChoice?.kind).toBe('special-pick');

    if (state.subChoice?.kind !== 'special-pick') {
      throw new Error('expected special-pick');
    }

    expect(state.subChoice.eligibleCardIds).toHaveLength(19);
    expect(state.subChoice.eligibleCardIds).not.toContain('card-transformer');
    expect(completeSpecialPick(state, a.id, 'card-transformer').ok).toBe(false);
  });
});
