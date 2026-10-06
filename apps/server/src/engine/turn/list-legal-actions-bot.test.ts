/**
 * Bot legal-action set — Lot 69 slot cap.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { listLegalActions, listLegalActionsForBot } from './list-legal-actions';

describe('listLegalActionsForBot', () => {
  it('omits deactivatePersistent while humans still have it', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'bot-no-deactivate',
    });
    const a = state.players.find((player) => player.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3 }),
    ];
    state.currentTurnPlayerId = a.id;

    const human = listLegalActions(state, a.id);
    const bot = listLegalActionsForBot(state, a.id);

    expect(human.some((action) => action.type === 'deactivatePersistent')).toBe(true);
    expect(bot.some((action) => action.type === 'deactivatePersistent')).toBe(false);
  });
});
