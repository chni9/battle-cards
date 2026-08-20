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
          kind: 'actionPlayed',
          actorPlayerId: 'alice',
          action: 'playCard',
          cardId: 'basic-attack',
          targetPlayerId: 'bob',
          turnSequence: 1,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'alice',
          action: 'playMultipleAttacks',
          attacks: [
            { cardId: 'basic-attack', targetPlayerId: 'bob', isUpgraded: false },
            { cardId: 'super-attack', targetPlayerId: 'bob', isUpgraded: false },
          ],
          turnSequence: 2,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bob',
          action: 'buyCard',
          cardId: 'tax',
          turnSequence: 3,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bob',
          action: 'sellCard',
          cardId: 'tax',
          turnSequence: 4,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'alice',
          action: 'upgradeCard',
          cardId: 'basic-attack',
          turnSequence: 5,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'alice',
          action: 'buySpecialCard',
          cardId: 'suicide',
          turnSequence: 6,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bob',
          action: 'buyUpgradePoint',
          turnSequence: 7,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bob',
          action: 'sellUpgradePoint',
          turnSequence: 8,
        },
        {
          kind: 'actionPlayed',
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
    expect(snapshot.hasBots).toBe(false);
    expect(snapshot.actionLog).toHaveLength(9);
    expect(snapshot.exportLog.events).toEqual([...snapshot.actionLog]);
    expect(snapshot.exportLog.turns).toEqual([]);
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
      isBot: false,
      botDifficulty: null,
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
          kind: 'actionPlayed',
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

  it('embeds turnHistory in exportLog for Excel-parity Postgres storage', () => {
    const alice = makePlayer({ id: 'alice', kitId: 'assassin' });
    const bob = makePlayer({ id: 'bob', kitId: 'untouchable', isEliminated: true });
    const turnRow = {
      turnSequence: 1,
      actorPlayerId: 'alice',
      action: 'draw' as const,
      before: [
        {
          playerId: 'alice',
          nickname: 'A',
          kitId: 'assassin' as const,
          lives: 10,
          points: 0,
          upgradePoints: 0,
          shield: 0,
          shieldIsUpgraded: false,
          isEliminated: false,
          hand: [],
          specialCards: [],
          pendingAttacks: [],
        },
      ],
      after: [
        {
          playerId: 'alice',
          nickname: 'A',
          kitId: 'assassin' as const,
          lives: 10,
          points: 1,
          upgradePoints: 0,
          shield: 0,
          shieldIsUpgraded: false,
          isEliminated: false,
          hand: [],
          specialCards: [],
          pendingAttacks: [],
        },
      ],
    };

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'ROOM02',
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
          kind: 'actionPlayed',
          actorPlayerId: 'alice',
          action: 'draw',
          turnSequence: 1,
        },
      ],
      turnHistory: [turnRow],
      eliminations: [],
    });

    expect(snapshot.exportLog.turns).toEqual([turnRow]);
    expect(snapshot.exportLog.events).toHaveLength(1);
  });

  it('marks solo bot seats (L17-04)', () => {
    const human = makePlayer({ id: 'human', kitId: 'kamikaze' });
    const bot = makePlayer({ id: 'bot-1', kitId: 'scientific', isEliminated: true });

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'SOLO01',
      startedAtMs: 0,
      endedAtMs: 10,
      winnerPlayerId: 'human',
      gameState: {
        mode: 'classic',
        seed: 's',
        turnSequence: 1,
        players: [human, bot],
      },
      actionLog: [],
      eliminations: [],
      botDifficultiesByPlayerId: new Map([['bot-1', 'easy']]),
    });

    expect(snapshot.hasBots).toBe(true);
    expect(snapshot.players[0]).toMatchObject({
      playerId: 'human',
      isBot: false,
      botDifficulty: null,
    });
    expect(snapshot.players[1]).toMatchObject({
      playerId: 'bot-1',
      isBot: true,
      botDifficulty: 'easy',
    });
  });
});

describe('buildFinishedGameSnapshot (L41-04 / technical spec v6 §7.2)', () => {
  it('defaults isTutorial to false when omitted', () => {
    const alice = makePlayer({ id: 'alice', kitId: 'kamikaze' });
    const bob = makePlayer({ id: 'bob', kitId: 'scientific', isEliminated: true });

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'CLASS1',
      startedAtMs: 0,
      endedAtMs: 10,
      winnerPlayerId: 'alice',
      gameState: {
        mode: 'classic',
        seed: 's',
        turnSequence: 1,
        players: [alice, bob],
      },
      actionLog: [],
      eliminations: [],
    });

    expect(snapshot.isTutorial).toBe(false);
  });

  it('records isTutorial when passed', () => {
    const alice = makePlayer({ id: 'alice', kitId: 'kamikaze' });
    const bob = makePlayer({ id: 'bob', kitId: 'scientific', isEliminated: true });

    const snapshot = buildFinishedGameSnapshot({
      roomId: 'TUTOR1',
      startedAtMs: 0,
      endedAtMs: 10,
      winnerPlayerId: 'alice',
      gameState: {
        mode: 'classic',
        seed: 's',
        turnSequence: 1,
        players: [alice, bob],
      },
      actionLog: [],
      eliminations: [],
      isTutorial: true,
    });

    expect(snapshot.isTutorial).toBe(true);
  });
});
