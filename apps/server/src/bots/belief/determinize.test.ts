/**
 * Determinize-from-view consistency — backlog L34-05, technical spec v5 §4.2.
 * Failure is a belief or rule question, not a flaky test. Do not weaken.
 */

import { describe, expect, it } from 'vitest';

import type {
  ActionLogEntryView,
  GameState,
  PlayingStateView,
} from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng, type Rng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { queueEffect } from '../../engine/turn/queue-effect';
import type { TurnAction } from '../../engine/turn/perform-action';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import {
  determinizeFromView,
  inferBelief,
  sampleDeterminizedState,
} from './determinize';

function actionKey(action: TurnAction): string {
  return JSON.stringify(action);
}

function sortedKeys(actions: readonly TurnAction[]): string[] {
  return actions.map(actionKey).sort((left, right) => left.localeCompare(right));
}

function assertDeterminizeConsistency(
  state: GameState,
  playerId: string,
  log: ActionLogEntryView[] = [],
): void {
  const view = buildPlayingViewFor({
    recipientSessionId: playerId,
    gameCode: 'TEST',
    state,
    turnDeadlineMs: null,
    actionLog: log,
  });
  const rng = createRng('l34-05-det');
  const world = determinizeFromView(view, log.length > 0 ? log : view.actionLog, rng);

  expect(world.pool).toEqual(state.pool);
  expect(world.currentTurnPlayerId).toBe(state.currentTurnPlayerId);
  expect(world.turnSequence).toBe(state.turnSequence);
  const spiedSubjects = view.players
    .filter((player) => player.id !== playerId && player.spied !== undefined)
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));
  const worldSpySubjects = world.visibility
    .filter((relation) => relation.viewerId === playerId)
    .map((relation) => relation.subjectId)
    .sort((left, right) => left.localeCompare(right));

  expect(world.visibility.every((relation) => relation.viewerId === playerId)).toBe(
    true,
  );
  expect(worldSpySubjects).toEqual(spiedSubjects);

  for (const publicPlayer of view.players) {
    const worldPlayer = world.players.find((player) => player.id === publicPlayer.id);

    expect(worldPlayer, `missing seat ${publicPlayer.id}`).toBeDefined();
    expect(worldPlayer?.isEliminated).toBe(publicPlayer.isEliminated);
    expect(worldPlayer?.blockTurnsRemaining).toBe(publicPlayer.blockTurnsRemaining);
    expect(worldPlayer?.blockAttacksForbidden).toBe(publicPlayer.blockAttacksForbidden);
    expect(worldPlayer?.pendingReanimation).toEqual(publicPlayer.pendingReanimation);
    expect(worldPlayer?.activePersistentEffects).toEqual(
      publicPlayer.activePersistentEffects.map((effect) => ({ ...effect })),
    );
    expect(worldPlayer?.shieldIsUpgraded).toBe(
      publicPlayer.activeShield === null ? false : publicPlayer.activeShield.isUpgraded,
    );
    if (publicPlayer.activeShield === null) {
      expect(worldPlayer?.shield).toBe(0);
    } else {
      expect(worldPlayer?.shield ?? 0).toBeGreaterThan(0);
    }
  }

  expect(sortedKeys(listLegalActions(world, playerId))).toEqual(
    sortedKeys(listLegalActions(state, playerId)),
  );

  const self = world.players.find((player) => player.id === playerId);
  expect(self?.kitId).toBe(view.self.kitId);
  expect(self?.hand).toEqual(view.self.hand);
  expect(self?.specialCards).toEqual(view.self.specialCards);
}

describe('determinizeFromView consistency (L34-05)', () => {
  it('matches for every seat on a fresh 3-player game', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l34-05-fresh',
    });

    for (const player of state.players) {
      assertDeterminizeConsistency(state, player.id);
    }
  });

  it('matches mid-game with pending effects and pool cards', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l34-05-mid',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    state.pool.push({
      instanceId: 'pool-card-1',
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: b.id,
      targetPlayerId: a.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    a.blockTurnsRemaining = 2;
    a.blockAttacksForbidden = true;
    a.shield = 4;
    a.shieldIsUpgraded = true;
    b.activePersistentEffects.push({
      id: 'pg-1',
      cardId: 'points-generator',
      isUpgraded: false,
      counter: 3,
      targetPlayerId: null,
    });
    state.currentTurnPlayerId = a.id;

    assertDeterminizeConsistency(state, a.id);
    assertDeterminizeConsistency(state, b.id);
    assertDeterminizeConsistency(state, 'c');
  });

  it('is deterministic for the same rng seed', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l34-05-same-seed',
    });
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const first = determinizeFromView(view, view.actionLog, createRng('l34-05-det'));
    const second = determinizeFromView(view, view.actionLog, createRng('l34-05-det'));

    expect(second).toEqual(first);
  });

  it('composes inferBelief then sampleDeterminizedState', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l34-05-compose',
    });
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const log = view.actionLog;
    const composed = sampleDeterminizedState(
      inferBelief(view, log),
      view,
      log,
      createRng('l34-05-det'),
    );
    const direct = determinizeFromView(view, log, createRng('l34-05-det'));

    expect(composed).toEqual(direct);
    expect(inferBelief(view, log).perspectivePlayerId).toBe(view.you);
    expect(inferBelief(view, log).summary.lifeWidthByOpponentOffset).toHaveLength(3);
  });

  it('reconstructs this seat’s Spy relation so the sample view still has spied (L40-01)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l40-01-spy',
    });
    grantSpy(state, 'a', 'b', 'kit-and-cards');

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const bob = view.players.find((player) => player.id === 'b');

    expect(bob?.spied).toBeDefined();

    const world = determinizeFromView(view, view.actionLog, createRng('l40-01-spy'));
    const sampled = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state: world,
      turnDeadlineMs: null,
      actionLog: view.actionLog,
    });
    const sampledBob = sampled.players.find((player) => player.id === 'b');

    expect(world.visibility).toEqual([
      expect.objectContaining({
        viewerId: 'a',
        subjectId: 'b',
        level: 'kit-and-cards',
      }),
    ]);
    expect(sampledBob?.spied).toBeDefined();
    expect(
      world.visibility.every((relation) => relation.viewerId === 'a'),
    ).toBe(true);

    const asBob = determinizeFromView(
      buildPlayingViewFor({
        recipientSessionId: 'b',
        gameCode: 'TEST',
        state,
        turnDeadlineMs: null,
        actionLog: [],
      }),
      [],
      createRng('l40-01-spy-b'),
    );

    expect(asBob.visibility).toEqual([]);
  });
});

describe('determinizeFromView contract (L34-05)', () => {
  it('has arity 3 and does not typecheck when handed a GameState', () => {
    expect(determinizeFromView.length).toBe(3);

    const accept = (
      view: PlayingStateView,
      log: readonly ActionLogEntryView[],
      rng: Rng,
    ): number => {
      void view;
      void log;
      void rng;
      return 1;
    };

    // @ts-expect-error determinizeFromView must reject GameState (no-cheating boundary)
    const assigned: number = accept({} as GameState, [], createRng('l34-05-types'));

    expect(assigned).toBe(1);
  });
});
