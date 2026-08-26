/**
 * Opponent public-log token chips — L51-09.
 */

import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView, KitId, PublicPlayerView } from '@card-battle/shared';

import { chipsForPublicLogEntry } from './opponent-token-chips';

function opponent(partial: Partial<PublicPlayerView> & Pick<PublicPlayerView, 'id'>): PublicPlayerView {
  return {
    nickname: partial.id,
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
    duplicationActive: false,
    pendingReanimation: null,
    absorbWindowOpen: false,
    ...partial,
  };
}

const you = opponent({ id: 'me', isYou: true });
const hidden = opponent({ id: 'opp' });
const spied = opponent({
  id: 'spy',
  spied: {
    kitId: 'scientific' as KitId,
    hand: [],
    specialCards: [],
    resourcesSnapshot: {
      lives: 10,
      points: 4,
      upgradePoints: 1,
      shield: 0,
      turnSequence: 1,
    },
  },
});
const live = opponent({
  id: 'live',
  spied: {
    kitId: 'scientific' as KitId,
    hand: [],
    specialCards: [],
    lives: 8,
    points: 3,
    upgradePoints: 1,
    shield: 0,
  },
});

describe('opponent public-log token chips (L51-09)', () => {
  it('skips Draw when kit Draw is hidden', () => {
    const entry: ActionLogEntryView = {
      kind: 'actionPlayed',
      actorPlayerId: 'opp',
      action: 'draw',
      turnSequence: 2,
    };
    expect(chipsForPublicLogEntry(entry, 'me', [you, hidden])).toEqual([]);
    expect(chipsForPublicLogEntry(entry, 'me', [you, { ...spied, id: 'opp' }])).toEqual([
      { playerId: 'opp', kind: 'point', count: 1 },
    ]);
  });

  it('uses catalog play cost and public resolve amounts for unspied seats', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'opp',
          action: 'playCard',
          cardId: 'basic-attack',
          isUpgraded: false,
          turnSequence: 3,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([{ playerId: 'opp', kind: 'point', count: 1 }]);

    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionResolved',
          effectId: 'e1',
          sourcePlayerId: 'opp',
          targetPlayerId: 'opp',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 2,
          shieldAbsorbed: 1,
          outcome: 'applied',
          turnSequence: 4,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([
      { playerId: 'opp', kind: 'life', count: 2 },
      { playerId: 'opp', kind: 'shield', count: 1 },
    ]);
  });

  it('does not invent chips for POV or live Spy seats', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'me',
          action: 'playCard',
          cardId: 'tax',
          turnSequence: 5,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([]);
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'live',
          action: 'upgradeCard',
          cardId: 'spy',
          turnSequence: 6,
        },
        'me',
        [you, live],
      ),
    ).toEqual([]);
  });

  it('skips Regeneration quantity (pointsPerLife) instead of inventing a count', () => {
    expect(
      chipsForPublicLogEntry(
        {
          kind: 'actionPlayed',
          actorPlayerId: 'opp',
          action: 'playCard',
          cardId: 'regeneration',
          isUpgraded: false,
          turnSequence: 7,
        },
        'me',
        [you, hidden],
      ),
    ).toEqual([]);
  });
});
