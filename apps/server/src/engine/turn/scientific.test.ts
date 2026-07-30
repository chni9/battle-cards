/**
 * Scientific alwaysUpgraded on Spy — rules spec §4, backlog L4-04.
 */

import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { upgradeCard } from '../economy/upgrade-card';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Scientific alwaysUpgraded (L4-04)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('Spy bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({ seats, seed: 'sci-mid-buy' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();
    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.kitId = 'scientific';
    actor.points = 50;
    actor.upgradePoints = 3;

    // Advance until the actor's 12th turn action (acceptance: purchase on turn 12).
    for (let actorTurns = 0; actorTurns < 11; actorTurns += 1) {
      while (state.currentTurnPlayerId !== actorId) {
        const otherId = state.currentTurnPlayerId;
        expect(otherId).not.toBeNull();
        if (otherId === null) {
          return;
        }

        const otherTurn = performTurnAction(state, otherId, { type: 'draw' });
        expect(otherTurn.ok).toBe(true);
      }

      const burn = performTurnAction(state, actorId, { type: 'draw' });
      expect(burn.ok).toBe(true);
    }

    while (state.currentTurnPlayerId !== actorId) {
      const otherId = state.currentTurnPlayerId;
      expect(otherId).not.toBeNull();
      if (otherId === null) {
        return;
      }

      const otherTurn = performTurnAction(state, otherId, { type: 'draw' });
      expect(otherTurn.ok).toBe(true);
    }

    const upBefore = actor.upgradePoints;
    const result = performTurnAction(state, actorId, {
      type: 'buyCard',
      cardId: 'spy',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const boughtSpy = actor.hand.find((card) => card.cardId === 'spy' && card.isUpgraded);
    expect(boughtSpy).toBeDefined();
    expect(actor.upgradePoints).toBe(upBefore);
  });

  it('starting Spies from distribution are upgraded', () => {
    let scientific:
      | ReturnType<typeof createInitialState>['players'][number]
      | undefined;

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const state = createInitialState({ seats, seed: `sci-dist-${attempt}` });
      scientific = state.players.find(
        (player) =>
          player.kitId === 'scientific' &&
          player.hand.some((card) => card.cardId === 'spy'),
      );
      if (scientific !== undefined) {
        break;
      }
    }

    expect(scientific).toBeDefined();
    if (scientific === undefined) {
      return;
    }

    for (const spy of scientific.hand.filter((card) => card.cardId === 'spy')) {
      expect(spy.isUpgraded).toBe(true);
    }
  });

  it('upgradeCard rejects an already trait-upgraded Spy (no UP spend)', () => {
    const state = createInitialState({ seats, seed: 'sci-upgrade-reject' });
    const actor = state.players[0];
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.kitId = 'scientific';
    actor.points = 8;
    actor.upgradePoints = 2;
    actor.hand = [];

    const bought = buyCard(state, actor.id, 'spy');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);

    const upgraded = upgradeCard(state, actor.id, bought.instance.instanceId);
    expect(upgraded.ok).toBe(false);
    expect(actor.upgradePoints).toBe(2);
  });
});
