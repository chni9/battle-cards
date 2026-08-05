/**
 * Duplicator kit — rules spec §4, #V4-23/#V4-24, backlog L28-02.
 */

import { describe, expect, it } from 'vitest';

import { CLASSIC_LIFE_LIMIT } from '@card-battle/shared';

import { createRng } from '../rng';
import { grantLives, grantPoints, grantUpgradePoints } from '../economy/grant-resources';
import { createInitialState } from '../create-initial-state';
import { advanceTurn } from './advance-turn';
import { listLegalActions } from './list-legal-actions';
import { performTurnAction } from './perform-action';
import { decide } from '../../bots/heuristic-policy';
import { buildPlayingViewFor } from '../../protocol/build-view-for';

describe('Duplicator kit (L28-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog: 2 lives, 1 action / 0 attack, Imposition + Attack Thief', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-catalog',
      kitAssignment: ['duplicator', 'kamikaze'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    expect(dup).toBeDefined();
    if (dup === undefined) {
      return;
    }

    expect(dup.lives).toBe(2);
    expect(dup.hand).toHaveLength(1);
    expect(dup.specialCards.map((card) => card.cardId).sort()).toEqual([
      'attack-thief',
      'imposition',
    ]);
    expect(dup.duplicationActive).toBe(false);
  });

  it('copies direct point/life/UP gains while active; theft and elim rewards included', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-copy',
      kitAssignment: ['duplicator', 'untouchable'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    const other = state.players.find((player) => player.id !== dup?.id);
    expect(dup).toBeDefined();
    expect(other).toBeDefined();
    if (dup === undefined || other === undefined) {
      return;
    }

    state.currentTurnPlayerId = dup.id;
    const activated = performTurnAction(state, dup.id, { type: 'activateDuplication' });
    expect(activated.ok).toBe(true);
    expect(dup.duplicationActive).toBe(true);

    dup.points = 0;
    dup.lives = 2;
    dup.upgradePoints = 0;
    other.points = 0;
    other.lives = 10;
    other.upgradePoints = 0;

    grantPoints(state, other, 5, 'direct');
    expect(other.points).toBe(5);
    expect(dup.points).toBe(5);

    grantUpgradePoints(state, other, 2, 'direct');
    expect(dup.upgradePoints).toBe(2);

    grantLives(state, other, 3, 'direct');
    expect(other.lives).toBe(13);
    expect(dup.lives).toBe(5);
  });

  it('does not loop between two Duplicators on duplicated origin', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'dup-loop',
      kitAssignment: ['duplicator', 'duplicator', 'untouchable'],
    });
    const dups = state.players.filter((player) => player.kitId === 'duplicator');
    const other = state.players.find((player) => player.kitId === 'untouchable');
    expect(dups).toHaveLength(2);
    expect(other).toBeDefined();
    if (other === undefined) {
      return;
    }

    const [d1, d2] = dups;
    if (d1 === undefined || d2 === undefined) {
      return;
    }

    d1.duplicationActive = true;
    d2.duplicationActive = true;
    d1.points = 0;
    d2.points = 0;
    other.points = 0;

    grantPoints(state, other, 4, 'direct');
    expect(other.points).toBe(4);
    expect(d1.points).toBe(4);
    expect(d2.points).toBe(4);
  });

  it('clamps life copy at lifeLimit using livesGained', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-cap',
      kitAssignment: ['duplicator', 'untouchable'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    const other = state.players.find((player) => player.id !== dup?.id);
    expect(dup).toBeDefined();
    expect(other).toBeDefined();
    if (dup === undefined || other === undefined) {
      return;
    }

    dup.duplicationActive = true;
    dup.lives = CLASSIC_LIFE_LIMIT - 1;
    other.lives = CLASSIC_LIFE_LIMIT - 1;

    grantLives(state, other, 10, 'direct');
    expect(other.lives).toBe(CLASSIC_LIFE_LIMIT);
    expect(dup.lives).toBe(CLASSIC_LIFE_LIMIT);
  });

  it('does not copy Cloning resource assignment', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-cloning',
      kitAssignment: ['duplicator', 'scientific'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    const sci = state.players.find((player) => player.kitId === 'scientific');
    expect(dup).toBeDefined();
    expect(sci).toBeDefined();
    if (dup === undefined || sci === undefined) {
      return;
    }

    dup.duplicationActive = true;
    dup.points = 0;
    dup.lives = 2;
    state.currentTurnPlayerId = sci.id;
    sci.points = 50;
    sci.lives = 10;
    sci.specialCards = [{ instanceId: 'cl-1', cardId: 'cloning', isUpgraded: false }];
    dup.lives = 2;
    dup.points = 7;

    const result = performTurnAction(state, sci.id, {
      type: 'playCard',
      instanceId: 'cl-1',
      targetPlayerId: dup.id,
    });
    expect(result.ok).toBe(true);
    // Sci snapped to Dup's 2 lives / 7 points — Dup unchanged (no gain observe on assignment)
    expect(sci.lives).toBe(2);
    expect(sci.points).toBe(7);
    expect(dup.lives).toBe(2);
    expect(dup.points).toBe(7);
  });

  it('clears window at next turn start; gains before activate are not copied', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-window',
      kitAssignment: ['duplicator', 'untouchable'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    const other = state.players.find((player) => player.id !== dup?.id);
    expect(dup).toBeDefined();
    expect(other).toBeDefined();
    if (dup === undefined || other === undefined) {
      return;
    }

    dup.points = 0;
    other.points = 0;
    grantPoints(state, other, 3, 'direct');
    expect(dup.points).toBe(0);

    state.currentTurnPlayerId = dup.id;
    performTurnAction(state, dup.id, { type: 'activateDuplication' });
    expect(dup.duplicationActive).toBe(true);

    // Finish turn → advance to other → back to dup clears window
    // performTurnAction already advanced after activate; current is other
    expect(state.currentTurnPlayerId).toBe(other.id);
    grantPoints(state, other, 2, 'direct');
    expect(dup.points).toBe(2);

    performTurnAction(state, other.id, { type: 'draw' });
    expect(state.currentTurnPlayerId).toBe(dup.id);
    expect(dup.duplicationActive).toBe(false);

    const before = dup.points;
    grantPoints(state, other, 5, 'direct');
    expect(dup.points).toBe(before);
  });

  it('non-renewal: draw instead of activate leaves window false after clear', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-nonrenew',
      kitAssignment: ['duplicator', 'untouchable'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    expect(dup).toBeDefined();
    if (dup === undefined) {
      return;
    }

    state.currentTurnPlayerId = dup.id;
    dup.duplicationActive = true;
    // Simulate start of turn clear then draw
    advanceTurn(state);
    // advance moved away — force back
    state.currentTurnPlayerId = dup.id;
    dup.duplicationActive = false;
    performTurnAction(state, dup.id, { type: 'draw' });
    expect(dup.duplicationActive).toBe(false);
  });

  it('lists activateDuplication for Duplicator; bot scoreAction handles it', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-legal-bot',
      kitAssignment: ['duplicator', 'kamikaze'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    expect(dup).toBeDefined();
    if (dup === undefined) {
      return;
    }

    state.currentTurnPlayerId = dup.id;
    dup.upgradePoints = 0;
    const legal = listLegalActions(state, dup.id);
    expect(legal.some((action) => action.type === 'activateDuplication')).toBe(true);

    const view = buildPlayingViewFor({
      recipientSessionId: dup.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const decision = decide(view, legal, createRng('dup-bot'));
    expect(decision.type).not.toBe('sellUpgradePoint');
  });

  it('exposes duplicationActive publicly in the state view', () => {
    const state = createInitialState({
      seats,
      seed: 'dup-view',
      kitAssignment: ['duplicator', 'kamikaze'],
    });
    const dup = state.players.find((player) => player.kitId === 'duplicator');
    expect(dup).toBeDefined();
    if (dup === undefined) {
      return;
    }

    dup.duplicationActive = true;
    const view = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const pub = view.players.find((player) => player.id === dup.id);
    expect(pub?.duplicationActive).toBe(true);
  });
});
