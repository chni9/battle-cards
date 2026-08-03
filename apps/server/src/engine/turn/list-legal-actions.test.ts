/**
 * §10.2 — every enumerated action is accepted by `performTurnAction` (L16-01).
 * Technical spec v3 §10.2 / §4.3.
 */

import { describe, expect, it } from 'vitest';

import type { GameState, Player } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import { listLegalActions } from './list-legal-actions';
import { performTurnAction, type TurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function requirePlayer(state: GameState, id: string): Player {
  const player = state.players.find((entry) => entry.id === id);

  if (player === undefined) {
    throw new Error(`missing player ${id}`);
  }

  return player;
}

/** Closed-form upper bound — technical spec v3 §4.3 table (no Assassin multi yet). */
function maxEnumeratedActions(actor: Player, opponentCount: number): number {
  const held = actor.hand.length + actor.specialCards.length;
  const playCardBound = held * (1 + opponentCount) + held * 4; // regen overcount OK
  const economyBound = 10 + actor.hand.length + held + 2 + 1;
  return 1 + playCardBound + economyBound;
}

function assertAllAccepted(state: GameState, playerId: string): void {
  const actions = listLegalActions(state, playerId);
  const actor = requirePlayer(state, playerId);
  const opponents = state.players.filter((p) => p.id !== playerId && !p.isEliminated);

  expect(actions.some((action) => action.type === 'draw')).toBe(true);
  expect(actions.length).toBeLessThanOrEqual(maxEnumeratedActions(actor, opponents.length));

  for (const action of actions) {
    const clone = cloneState(state);
    clone.currentTurnPlayerId = playerId;
    clone.mirrorChoice = null;
    clone.rewardChoice = null;
    clone.rewardQueue = [];

    const result = performTurnAction(clone, playerId, action);
    expect(result.ok, rejectionMessage(action, result)).toBe(true);
  }
}

function rejectionMessage(action: TurnAction, result: { ok: boolean; message?: string }): string {
  if (result.ok) {
    return '';
  }

  return `rejected ${JSON.stringify(action)}: ${result.message}`;
}

describe('listLegalActions §10.2 (L16-01)', () => {
  it('accepts every enumerated action on a fresh 2-player game for each seat', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'list-legal-10-2-fresh',
    });

    for (const player of state.players) {
      assertAllAccepted(state, player.id);
    }
  });

  it('accepts actions when the actor is rich enough for shop and upgrades', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'list-legal-10-2-rich',
    });

    for (const player of state.players) {
      player.points = 100;
      player.upgradePoints = 5;
      player.shield = 0;
    }

    for (const player of state.players) {
      assertAllAccepted(state, player.id);
    }
  });

  it('accepts Mirror when a redirectable attack is pending on the actor', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'list-legal-10-2-mirror',
    });

    const actor = requirePlayer(state, 'a');
    const foe = requirePlayer(state, 'b');
    actor.points = 50;
    actor.hand = [
      {
        instanceId: 'mirror-1',
        cardId: 'mirror',
        isUpgraded: false,
      },
      {
        instanceId: 'regen-1',
        cardId: 'regeneration',
        isUpgraded: false,
      },
    ];
    actor.specialCards = [];
    actor.shield = 0;

    queueEffect({
      state,
      sourcePlayerId: foe.id,
      targetPlayerId: actor.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    assertAllAccepted(state, actor.id);
  });

  it('excludes unaffordable point-cost plays while keeping draw', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'list-legal-10-2-broke',
    });

    const actor = requirePlayer(state, 'a');
    actor.points = 0;
    actor.upgradePoints = 0;
    actor.lives = 1; // Tax buyCost is 2 lives — unaffordable
    actor.hand = [
      {
        instanceId: 'sa-1',
        cardId: 'super-attack',
        isUpgraded: false,
      },
    ];
    actor.specialCards = [];

    const actions = listLegalActions(state, actor.id);
    expect(actions).toContainEqual({ type: 'draw' });
    expect(actions.some((action) => action.type === 'playCard')).toBe(false);
    expect(actions.some((action) => action.type === 'buyCard')).toBe(false);
    assertAllAccepted(state, actor.id);
  });

  it('returns empty for an eliminated player', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'list-legal-10-2-elim',
    });

    const actor = requirePlayer(state, 'a');
    actor.isEliminated = true;

    expect(listLegalActions(state, actor.id)).toEqual([]);
  });
});
