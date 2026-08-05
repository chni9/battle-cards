import { describe, expect, it } from 'vitest';

import type { PlayingStateView } from '@card-battle/shared';

import {
  buildPersistentIncomingChips,
  buildPersistentOthersChips,
} from './persistent-incoming';

function baseView(): PlayingStateView {
  return {
    phase: 'playing',
    you: 'a',
    gameCode: 'ABCDEF',
    currentTurnPlayerId: 'a',
    turnSequence: 1,
    turnOrder: ['a', 'b'],
    turnDeadlineMs: null,
    players: [
      {
        id: 'a',
        nickname: 'Alice',
        isEliminated: false,
        isYou: true,
        isBot: false,
        connection: {
          status: 'connected',
          disconnectedAt: null,
          automaticTurnsTaken: 0,
          consecutiveTimeouts: 0,
        },
        activePersistentEffects: [],
        activeShield: null,
        blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
        activeAttackBlock: null,
      },
      {
        id: 'b',
        nickname: 'Bob',
        isEliminated: false,
        isYou: false,
        isBot: false,
        connection: {
          status: 'connected',
          disconnectedAt: null,
          automaticTurnsTaken: 0,
          consecutiveTimeouts: 0,
        },
        activePersistentEffects: [],
        activeShield: null,
        blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
        activeAttackBlock: null,
      },
    ],
    self: {
      lives: 10,
      shield: 0,
      shieldIsUpgraded: false,
      points: 0,
      upgradePoints: 0,
      kitId: 'assassin',
      hand: [],
      specialCards: [],
      activePersistentEffects: [],
      attackBlockCharges: 0,
    },
    pendingEffects: [],
    actionLog: [],
    pool: [],
  };
}

describe('persistent incoming chips', () => {
  it('lists opponent Imposition and own Points Generator on Incoming', () => {
    const view = baseView();
    const alice = view.players[0];
    const bob = view.players[1];
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.activePersistentEffects = [
      { id: 'pg-1', cardId: 'points-generator', isUpgraded: false, counter: 3 , targetPlayerId: null},
    ];
    bob.activePersistentEffects = [
      { id: 'imp-1', cardId: 'imposition', isUpgraded: true, counter: 2 , targetPlayerId: null},
    ];
    // Mirror on self for PrivateSelfView consistency (chips read public seats).
    view.self = {
      ...view.self,
      activePersistentEffects: alice.activePersistentEffects,
    };

    const chips = buildPersistentIncomingChips(view);
    expect(chips.map((c) => c.cardId).sort()).toEqual([
      'imposition',
      'points-generator',
    ]);
    expect(chips.find((c) => c.cardId === 'imposition')?.sourcePlayerId).toBe('b');
    expect(chips.find((c) => c.cardId === 'points-generator')?.sourcePlayerId).toBe(
      'a',
    );
  });

  it('lists own Imposition once per living opponent on the felt strip', () => {
    const view = baseView();
    const alice = view.players[0];
    if (alice === undefined) {
      return;
    }
    alice.activePersistentEffects = [
      { id: 'imp-a', cardId: 'imposition', isUpgraded: false, counter: 2 , targetPlayerId: null},
    ];
    view.self = {
      ...view.self,
      activePersistentEffects: alice.activePersistentEffects,
    };

    const chips = buildPersistentOthersChips(view);
    expect(chips).toHaveLength(1);
    expect(chips[0]?.targetPlayerId).toBe('b');
    expect(chips[0]?.sourcePlayerId).toBe('a');
  });
});
