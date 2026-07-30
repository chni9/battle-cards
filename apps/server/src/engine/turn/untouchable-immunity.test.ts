/**
 * Untouchable immunity — rules spec §4, backlog L4-03.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Untouchable immunity (L4-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('Thief against Untouchable resolves as immune with no points stolen', () => {
    const state = createInitialState({ seats, seed: 'immune-thief' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();
    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);
    const target = state.players.find((player) => player.id !== actorId);

    expect(actor).toBeDefined();
    expect(target).toBeDefined();
    if (actor === undefined || target === undefined) {
      return;
    }

    target.kitId = 'untouchable';
    target.points = 12;
    actor.points = 10;
    actor.hand = [{ instanceId: 'thief-1', cardId: 'thief', isUpgraded: false }];

    performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'thief-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    const result = performTurnAction(state, target.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.outcome).toBe('immune');
    expect(result.resolved[0]?.cardId).toBe('thief');
    // Draw (+1) still applies; Thief did not steal.
    expect(target.points).toBe(13);
    expect(actor.points).toBe(5); // paid 5 for thief play only
  });

  it('Spy against Untouchable resolves as immune with no visibility grant', () => {
    const state = createInitialState({ seats, seed: 'immune-spy' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();
    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);
    const target = state.players.find((player) => player.id !== actorId);

    expect(actor).toBeDefined();
    expect(target).toBeDefined();
    if (actor === undefined || target === undefined) {
      return;
    }

    target.kitId = 'untouchable';
    actor.points = 10;
    actor.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];

    performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    const result = performTurnAction(state, target.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.resolved[0]?.outcome).toBe('immune');

    const viewForSpy = buildPlayingViewFor({
      recipientSessionId: actorId,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(viewForSpy.players.find((player) => player.id === target.id)?.spied).toBeUndefined();
  });

  it('Kamikaze starting resources match the roster', () => {
    let kamikaze:
      | ReturnType<typeof createInitialState>['players'][number]
      | undefined;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const state = createInitialState({ seats, seed: `kami-${attempt}` });
      kamikaze = state.players.find((player) => player.kitId === 'kamikaze');
      if (kamikaze !== undefined) {
        break;
      }
    }

    expect(kamikaze).toBeDefined();
    if (kamikaze === undefined) {
      return;
    }

    expect(kamikaze.lives).toBe(4);
    expect(kamikaze.points).toBe(9);
    expect(kamikaze.upgradePoints).toBe(1);
  });
});
