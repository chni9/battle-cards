/**
 * §10.1 — legal actions from GameState equal those from the acting player's view (L16-03).
 * Technical spec v3 §10.1. Failure = a handler leaks hidden state — stop and ask.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import { grantSpy } from '../../protocol/visibility-matrix';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { enumerationStateFromView } from './enumeration-state-from-view';
import { listLegalActions } from './list-legal-actions';
import { queueEffect } from './queue-effect';
import type { TurnAction } from './perform-action';

function actionKey(action: TurnAction): string {
  return JSON.stringify(action);
}

function sortedKeys(actions: readonly TurnAction[]): string[] {
  return actions.map(actionKey).sort((left, right) => left.localeCompare(right));
}

function assertViewParity(state: GameState, playerId: string): void {
  const fromState = listLegalActions(state, playerId);
  const view = buildPlayingViewFor({
    recipientSessionId: playerId,
    gameCode: 'TEST',
    state,
    turnDeadlineMs: null,
    actionLog: [],
  });
  const fromView = listLegalActions(enumerationStateFromView(view, state.seed), playerId);

  expect(sortedKeys(fromView), `view parity for ${playerId}`).toEqual(sortedKeys(fromState));
}

describe('listLegalActions §10.1 view-only guard (L16-03)', () => {
  it('matches for every seat on a fresh multi-player game', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'view-legal-fresh',
    });

    for (const player of state.players) {
      assertViewParity(state, player.id);
    }
  });

  it('matches with rich resources and Assassin multi candidates', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'view-legal-assassin',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'assassin';
    actor.points = 80;
    actor.upgradePoints = 2;
    actor.hand = [
      { instanceId: 'a1', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'strong-attack', isUpgraded: false },
      { instanceId: 'a3', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'm1', cardId: 'mirror', isUpgraded: false },
    ];

    for (const player of state.players) {
      assertViewParity(state, player.id);
    }
  });

  it('matches with Mirror-eligible pending and base Spy', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'view-legal-spy-base',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.points = 40;
    a.hand = [
      { instanceId: 'm1', cardId: 'mirror', isUpgraded: false },
      { instanceId: 's1', cardId: 'spy', isUpgraded: false },
    ];
    queueEffect({
      state,
      sourcePlayerId: b.id,
      targetPlayerId: a.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    grantSpy(state, a.id, b.id, 'kit-and-cards');

    assertViewParity(state, a.id);
    assertViewParity(state, b.id);
  });

  it('matches with upgraded Spy', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'view-legal-spy-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.points = 40;
    a.hand = [{ instanceId: 's1', cardId: 'spy', isUpgraded: true }];
    grantSpy(state, a.id, b.id, 'full-resources');

    assertViewParity(state, a.id);
    assertViewParity(state, b.id);
  });
});
