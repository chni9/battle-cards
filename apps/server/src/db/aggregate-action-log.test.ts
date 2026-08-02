import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView } from '@card-battle/shared';

import { aggregateActionsForPlayer } from './aggregate-action-log';

describe('aggregateActionsForPlayer (L8 / L9)', () => {
  it('counts only actionPlayed entries', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'playCard',
        cardId: 'basic-attack',
        targetPlayerId: 'bob',
        turnSequence: 1,
      },
      {
        kind: 'actionResolved',
        effectId: 'e1',
        sourcePlayerId: 'alice',
        targetPlayerId: 'bob',
        cardId: 'basic-attack',
        isUpgraded: false,
        livesLost: 1,
        shieldAbsorbed: 0,
        outcome: 'applied',
        turnSequence: 2,
      },
      {
        kind: 'playerEliminated',
        playerId: 'bob',
        eliminatorPlayerId: 'alice',
        reason: 'combat',
        turnSequence: 2,
      },
      {
        kind: 'rewardsClaimed',
        eliminatorPlayerId: 'alice',
        eliminatedPlayerId: 'bob',
        turnSequence: 2,
      },
      {
        kind: 'mirrorRedirected',
        actorPlayerId: 'alice',
        cardId: 'basic-attack',
        previousTargetPlayerId: 'alice',
        newTargetPlayerId: 'bob',
        turnSequence: 3,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'buyCard',
        cardId: 'tax',
        turnSequence: 4,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log)).toEqual({
      cardsPlayedCount: 1,
      cardsPlayedById: { 'basic-attack': 1 },
      buyCount: 1,
      sellCount: 0,
      upgradeCount: 0,
    });
  });
});
