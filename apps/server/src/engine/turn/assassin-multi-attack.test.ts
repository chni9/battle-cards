/**
 * Assassin playMultipleAttacks — rules spec §4, backlog L4-05.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Assassin playMultipleAttacks (L4-05)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('queues three independent attacks in one turn', () => {
    const state = createInitialState({ seats, seed: 'assassin-3' });
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

    actor.kitId = 'assassin';
    actor.points = 20;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a3', cardId: 'strong-attack', isUpgraded: false },
    ];
    target.kitId = 'kamikaze';

    const result = performTurnAction(state, actorId, {
      type: 'playMultipleAttacks',
      attacks: [
        { instanceId: 'a1', targetPlayerId: target.id },
        { instanceId: 'a2', targetPlayerId: target.id },
        { instanceId: 'a3', targetPlayerId: target.id },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('playMultipleAttacks');
    expect(result.actionPlayed.attacks).toHaveLength(3);
    expect(target.pendingEffects).toHaveLength(3);
    expect(actor.points).toBe(16); // 1+1+2
    expect(new Set(target.pendingEffects.map((effect) => effect.id)).size).toBe(3);
    expect(target.pendingEffects.map((effect) => effect.cardId)).toEqual([
      'basic-attack',
      'basic-attack',
      'strong-attack',
    ]);
  });

  it('rejects all-or-nothing when points are insufficient', () => {
    const state = createInitialState({ seats, seed: 'assassin-broke' });
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

    actor.kitId = 'assassin';
    actor.points = 2;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'strong-attack', isUpgraded: false },
    ];

    const result = performTurnAction(state, actorId, {
      type: 'playMultipleAttacks',
      attacks: [
        { instanceId: 'a1', targetPlayerId: target.id },
        { instanceId: 'a2', targetPlayerId: target.id },
      ],
    });

    expect(result.ok).toBe(false);
    expect(target.pendingEffects).toHaveLength(0);
    expect(actor.points).toBe(2);
  });

  it('rejects non-Assassin kits', () => {
    const state = createInitialState({ seats, seed: 'assassin-deny' });
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

    actor.kitId = 'kamikaze';
    actor.points = 20;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'basic-attack', isUpgraded: false },
    ];

    const result = performTurnAction(state, actorId, {
      type: 'playMultipleAttacks',
      attacks: [
        { instanceId: 'a1', targetPlayerId: target.id },
        { instanceId: 'a2', targetPlayerId: target.id },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it('rejects fewer than two attacks', () => {
    const state = createInitialState({ seats, seed: 'assassin-one' });
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

    actor.kitId = 'assassin';
    actor.points = 20;
    actor.hand = [{ instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playMultipleAttacks',
      attacks: [{ instanceId: 'a1', targetPlayerId: target.id }],
    });

    expect(result.ok).toBe(false);
  });
});
