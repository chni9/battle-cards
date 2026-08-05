import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  type CardId,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { performTurnAction } from '../engine/turn/perform-action';
import { cardHandlers, findHandler, IMPLEMENTED_CARD_IDS, PENDING_CARD_IDS } from './registry';

const ALL_CARD_IDS: readonly CardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  ...SPECIAL_CARD_IDS,
];

describe('card handler registry (technical spec §4.1)', () => {
  it('registers a handler for exactly the cards declared implemented', () => {
    expect(Object.keys(cardHandlers).sort()).toEqual([...IMPLEMENTED_CARD_IDS].sort());
  });

  it('accounts for all declared cards across the implemented and pending lists', () => {
    const accountedFor = [...IMPLEMENTED_CARD_IDS, ...PENDING_CARD_IDS];

    expect(accountedFor.slice().sort()).toEqual([...ALL_CARD_IDS].sort());
    expect(PENDING_CARD_IDS).toHaveLength(6);
  });

  it('never lists a card as both implemented and pending', () => {
    const implemented = new Set<CardId>(IMPLEMENTED_CARD_IDS);

    expect(PENDING_CARD_IDS.filter((id) => implemented.has(id))).toEqual([]);
  });
});

describe('findHandler', () => {
  it('returns undefined for every card still pending, rather than throwing', () => {
    // The engine rejects the action; an unimplemented card must never crash a room.
    expect(PENDING_CARD_IDS.filter((cardId) => findHandler(cardId) !== undefined)).toEqual([]);
  });

  it('rejects play of a pending special without crashing (L20-04)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l20-04-pending-play',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.specialCards = [
      { instanceId: 'pending-1', cardId: 'block', isUpgraded: false },
    ];
    actor.points = 20;
    state.currentTurnPlayerId = actor.id;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'pending-1',
    });

    expect(result.ok).toBe(false);
    expect(actor.specialCards).toHaveLength(1);
  });

  it('returns the registered handler for every implemented card', () => {
    for (const cardId of IMPLEMENTED_CARD_IDS) {
      expect(findHandler(cardId)).toBe(cardHandlers[cardId]);
    }
  });
});
