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
        isUpgraded: false,
        damageMultiplier: 1,
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
      specialsPlayedCount: 0,
      buyCardCount: 1,
      sellCardCount: 0,
      drawCount: 0,
      attacksPlayedCount: 1,
      damageDealt: 1,
      kills: 1,
    });
  });
});

describe('aggregateActionsForPlayer (L59-04)', () => {
  it('includes buyPoolCard in buyCardCount and excludes upgrade-point trades', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'buyPoolCard',
        cardId: 'basic-attack',
        turnSequence: 1,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'buySpecialCard',
        cardId: 'suicide',
        turnSequence: 2,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'buyUpgradePoint',
        turnSequence: 3,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'sellCard',
        cardId: 'tax',
        turnSequence: 4,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'sellUpgradePoint',
        turnSequence: 5,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log)).toMatchObject({
      buyCount: 3,
      buyCardCount: 2,
      sellCount: 2,
      sellCardCount: 1,
    });
  });

  it('counts real draw and not activateDuplication', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'draw',
        turnSequence: 1,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'activateDuplication',
        turnSequence: 2,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log).drawCount).toBe(1);
  });

  it('counts specials, assassin volley attacks, and mega-attack as both', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'playCard',
        cardId: 'suicide',
        turnSequence: 1,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'playCard',
        cardId: 'mega-attack',
        targetPlayerId: 'bob',
        turnSequence: 2,
      },
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'playMultipleAttacks',
        attacks: [
          { cardId: 'basic-attack', targetPlayerId: 'bob', isUpgraded: false },
          { cardId: 'strong-attack', targetPlayerId: 'carol', isUpgraded: false },
        ],
        turnSequence: 3,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log)).toMatchObject({
      specialsPlayedCount: 2,
      attacksPlayedCount: 3,
      cardsPlayedCount: 4,
    });
  });

  it('counts attack damageDealt and ignores Tax life loss', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionResolved',
        effectId: 'atk',
        sourcePlayerId: 'alice',
        targetPlayerId: 'bob',
        cardId: 'strong-attack',
        isUpgraded: false,
        livesLost: 3,
        shieldAbsorbed: 0,
        outcome: 'applied',
        turnSequence: 2,
      },
      {
        kind: 'actionResolved',
        effectId: 'tax',
        sourcePlayerId: 'alice',
        targetPlayerId: 'bob',
        cardId: 'tax',
        isUpgraded: false,
        livesLost: 2,
        shieldAbsorbed: 0,
        outcome: 'applied',
        turnSequence: 4,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log).damageDealt).toBe(3);
  });

  it('credits combat kills only — leave / absence / inactivity do not count', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'playerEliminated',
        playerId: 'bob',
        eliminatorPlayerId: 'alice',
        reason: 'combat',
        turnSequence: 2,
      },
      {
        kind: 'playerEliminated',
        playerId: 'carol',
        eliminatorPlayerId: 'alice',
        reason: 'leave',
        turnSequence: 3,
      },
      {
        kind: 'playerEliminated',
        playerId: 'dave',
        eliminatorPlayerId: null,
        reason: 'absence',
        turnSequence: 4,
      },
      {
        kind: 'playerEliminated',
        playerId: 'erin',
        eliminatorPlayerId: 'alice',
        reason: 'inactivity',
        turnSequence: 5,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log).kills).toBe(1);
    expect(aggregateActionsForPlayer('bob', log).kills).toBe(0);
  });

  it('does not treat clearSpy as a buy, play, or draw', () => {
    const log: ActionLogEntryView[] = [
      {
        kind: 'actionPlayed',
        actorPlayerId: 'alice',
        action: 'clearSpy',
        turnSequence: 1,
      },
    ];

    expect(aggregateActionsForPlayer('alice', log)).toMatchObject({
      buyCount: 0,
      buyCardCount: 0,
      cardsPlayedCount: 0,
      drawCount: 0,
      specialsPlayedCount: 0,
    });
  });
});
