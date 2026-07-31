import { describe, expect, it } from 'vitest';

import { makePlayer } from '../testing/factories';
import { buildFinishedGameSnapshot } from './build-finished-game-snapshot';

describe('buildFinishedGameSnapshot (technical spec §3, L8-01)', () => {
  it('records kits, seed, turnSequence, final holdings, elim causes, and play aggregates', () => {
    const alice = makePlayer({
      id: 'alice',
      nickname: 'Alice',
      kitId: 'kamikaze',
      lives: 7,
      points: 12,
      upgradePoints: 1,
      shield: 2,
      shieldIsUpgraded: true,
      hand: [{ instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false }],
      specialCards: [{ instanceId: 's1', cardId: 'suicide', isUpgraded: false }],
      isEliminated: false,
    });
    const bob = makePlayer({
      id: 'bob',
      nickname: 'Bob',
      kitId: 'scientific',
      lives: 0,
      points: 0,
      upgradePoints: 0,
      shield: 0,
      isEliminated: true,
    });

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'ABCDEF',
      startedAtMs: 1_000,
      endedAtMs: 4_000,
      winnerPlayerId: 'alice',
      gameState: {
        mode: 'classic',
        seed: 'log-seed',
        turnSequence: 42,
        players: [alice, bob],
      },
      actionLog: [
        {
          actorPlayerId: 'alice',
          action: 'playCard',
          cardId: 'basic-attack',
          targetPlayerId: 'bob',
          turnSequence: 1,
        },
        {
          actorPlayerId: 'alice',
          action: 'playMultipleAttacks',
          attacks: [
            { cardId: 'basic-attack', targetPlayerId: 'bob' },
            { cardId: 'super-attack', targetPlayerId: 'bob' },
          ],
          turnSequence: 2,
        },
        {
          actorPlayerId: 'bob',
          action: 'buyCard',
          cardId: 'tax',
          turnSequence: 3,
        },
        {
          actorPlayerId: 'bob',
          action: 'sellCard',
          cardId: 'tax',
          turnSequence: 4,
        },
        {
          actorPlayerId: 'alice',
          action: 'upgradeCard',
          cardId: 'basic-attack',
          turnSequence: 5,
        },
        {
          actorPlayerId: 'alice',
          action: 'buySpecialCard',
          cardId: 'suicide',
          turnSequence: 6,
        },
        {
          actorPlayerId: 'bob',
          action: 'buyUpgradePoint',
          turnSequence: 7,
        },
        {
          actorPlayerId: 'bob',
          action: 'sellUpgradePoint',
          turnSequence: 8,
        },
        {
          actorPlayerId: 'alice',
          action: 'draw',
          turnSequence: 9,
        },
      ],
      eliminations: [
        {
          playerId: 'bob',
          eliminatorPlayerId: 'alice',
          reason: 'combat',
        },
      ],
    });

    expect(snapshot.roomId).toBe('ABCDEF');
    expect(snapshot.mode).toBe('classic');
    expect(snapshot.seed).toBe('log-seed');
    expect(snapshot.winnerPlayerId).toBe('alice');
    expect(snapshot.turnSequence).toBe(42);
    expect(snapshot.startedAt.toISOString()).toBe(new Date(1_000).toISOString());
    expect(snapshot.endedAt.toISOString()).toBe(new Date(4_000).toISOString());
    expect(snapshot.durationMs).toBe(3_000);
    expect(snapshot.actionLog).toHaveLength(9);
    expect(snapshot.eliminations).toEqual([
      { playerId: 'bob', eliminatorPlayerId: 'alice', reason: 'combat' },
    ]);

    const aliceRow = snapshot.players[0];
    const bobRow = snapshot.players[1];

    expect(aliceRow).toMatchObject({
      playerId: 'alice',
      seatIndex: 0,
      kitId: 'kamikaze',
      isWinner: true,
      isEliminated: false,
      lives: 7,
      points: 12,
      upgradePoints: 1,
      shield: 2,
      shieldIsUpgraded: true,
      cardsPlayedCount: 3,
      buyCount: 1,
      sellCount: 0,
      upgradeCount: 1,
    });
    expect(aliceRow?.hand).toEqual([
      { instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false },
    ]);
    expect(aliceRow?.specialCards).toEqual([
      { instanceId: 's1', cardId: 'suicide', isUpgraded: false },
    ]);
    expect(aliceRow?.cardsPlayedById).toEqual({
      'basic-attack': 2,
      'super-attack': 1,
    });

    expect(bobRow).toMatchObject({
      playerId: 'bob',
      seatIndex: 1,
      kitId: 'scientific',
      isWinner: false,
      isEliminated: true,
      cardsPlayedCount: 0,
      buyCount: 2,
      sellCount: 2,
      upgradeCount: 0,
      cardsPlayedById: {},
    });
  });

  it('counts playMultipleAttacks as 1 when attacks is absent', () => {
    const alice = makePlayer({ id: 'alice', kitId: 'assassin' });
    const bob = makePlayer({ id: 'bob', kitId: 'untouchable', isEliminated: true });

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'ROOM01',
      startedAtMs: 0,
      endedAtMs: 10,
      winnerPlayerId: 'alice',
      gameState: {
        mode: 'classic',
        seed: 's',
        turnSequence: 1,
        players: [alice, bob],
      },
      actionLog: [
        {
          actorPlayerId: 'alice',
          action: 'playMultipleAttacks',
          turnSequence: 1,
        },
      ],
      eliminations: [],
    });

    expect(snapshot.players[0]?.cardsPlayedCount).toBe(1);
    expect(snapshot.players[0]?.cardsPlayedById).toEqual({});
  });
});
