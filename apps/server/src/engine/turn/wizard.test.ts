/**
 * Wizard kit — rules spec §4, backlog L27-08.
 */

import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Wizard kit (L27-08)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog including draw 2 and MEGA ATTACK', () => {
    expect(getKit('wizard').startingResources.draw).toBe(2);
    expect(getKit('wizard').specialCards).toEqual(['mega-attack']);
    expect(getKit('wizard').traits.alwaysUpgraded).toEqual(['thief']);

    const state = createInitialState({
      seats,
      seed: 'wizard-catalog',
      kitAssignment: ['wizard', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'wizard');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.lives).toBe(10);
    expect(player.points).toBe(4);
    expect(player.specialCards.map((c) => c.cardId)).toEqual(['mega-attack']);
  });

  it('Thief bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'wizard-thief-buy',
      kitAssignment: ['wizard', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'wizard');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'thief');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });

  it('starting MEGA ATTACK is playable', () => {
    const state = createInitialState({
      seats,
      seed: 'wizard-play-mega',
      kitAssignment: ['wizard', 'kamikaze'],
    });
    const wizard = state.players.find((p) => p.kitId === 'wizard');
    const other = state.players.find((p) => p.kitId !== 'wizard');
    expect(wizard).toBeDefined();
    expect(other).toBeDefined();
    if (wizard === undefined || other === undefined) {
      return;
    }

    const mega = wizard.specialCards.find((c) => c.cardId === 'mega-attack');
    expect(mega).toBeDefined();
    if (mega === undefined) {
      return;
    }

    wizard.points = 50;
    state.currentTurnPlayerId = wizard.id;

    const play = performTurnAction(state, wizard.id, {
      type: 'playCard',
      instanceId: mega.instanceId,
    });
    expect(play.ok).toBe(true);
    expect(other.pendingEffects.some((effect) => effect.cardId === 'mega-attack')).toBe(
      true,
    );
  });
});
