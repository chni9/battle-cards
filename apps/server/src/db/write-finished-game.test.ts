import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FinishedGameSnapshot } from './finished-game-types';
import { resetPoolForTests } from './pool';
import { persistFinishedGame, writeFinishedGame } from './write-finished-game';

function sampleSnapshot(): FinishedGameSnapshot {
  return {
    roomId: 'ABCDEF',
    mode: 'classic',
    seed: 'seed',
    winnerPlayerId: 'alice',
    turnSequence: 3,
    startedAt: new Date(1_000),
    endedAt: new Date(2_000),
    durationMs: 1_000,
    actionLog: [],
    exportLog: { turns: [], events: [] },
    hasBots: false,
    isTutorial: false,
    players: [
      {
        playerId: 'alice',
        seatIndex: 0,
        kitId: 'kamikaze',
        isWinner: true,
        isEliminated: false,
        lives: 5,
        points: 1,
        upgradePoints: 0,
        shield: 0,
        shieldIsUpgraded: false,
        hand: [],
        specialCards: [],
        cardsPlayedCount: 0,
        cardsPlayedById: {},
        buyCount: 0,
        sellCount: 0,
        upgradeCount: 0,
        isBot: false,
        botDifficulty: null,
      },
    ],
    eliminations: [
      {
        playerId: 'bob',
        eliminatorPlayerId: 'alice',
        reason: 'combat',
      },
    ],
  };
}

describe('writeFinishedGame (technical spec §3, L8-02)', () => {
  it('inserts game, players, then eliminations inside one transaction', async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn((sql: string) => {
        queries.push(typeof sql === 'string' ? sql : String(sql));

        if (sql.includes('RETURNING id')) {
          return Promise.resolve({ rows: [{ id: 'game-uuid' }] });
        }

        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(() => Promise.resolve(client)),
    };

    await writeFinishedGame(pool as never, sampleSnapshot());

    expect(queries[0]).toBe('BEGIN');
    expect(queries.some((sql) => sql.includes('INSERT INTO finished_games'))).toBe(true);
    expect(queries.some((sql) => sql.includes('export_log'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO finished_game_players'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO finished_game_eliminations'))).toBe(
      true,
    );
    expect(queries.at(-1)).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows when an insert fails', async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn((sql: string) => {
        queries.push(sql);

        if (sql === 'BEGIN') {
          return Promise.resolve({ rows: [] });
        }

        if (sql.includes('INSERT INTO finished_games')) {
          return Promise.reject(new Error('insert failed'));
        }

        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(() => Promise.resolve(client)),
    };

    await expect(writeFinishedGame(pool as never, sampleSnapshot())).rejects.toThrow(
      'insert failed',
    );
    expect(queries).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });
  it('inserts has_bots and per-player bot columns (L17-04)', async () => {
    const bound: unknown[][] = [];
    const client = {
      query: vi.fn((sql: string, params?: unknown[]) => {
        if (params !== undefined) {
          bound.push(params);
        }

        if (sql.includes('RETURNING id')) {
          return Promise.resolve({ rows: [{ id: 'game-uuid' }] });
        }

        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(() => Promise.resolve(client)),
    };

    const snapshot = sampleSnapshot();
    snapshot.hasBots = true;
    const player = snapshot.players[0];
    if (player === undefined) {
      throw new Error('expected player');
    }
    const botPlayer = {
      ...player,
      playerId: 'bot-1',
      isBot: true,
      botDifficulty: 'normal' as const,
      isWinner: false,
    };

    await writeFinishedGame(pool as never, {
      ...snapshot,
      players: [
        { ...player, isBot: false, botDifficulty: null },
        botPlayer,
      ],
    });

    const gameInsert = bound.find((params) => params.length === 12);
    expect(gameInsert?.[9]).toBe(JSON.stringify(snapshot.exportLog));
    expect(gameInsert?.[10]).toBe(true);
    expect(gameInsert?.[11]).toBe(false);

    const playerInserts = bound.filter((params) => params.length === 20);
    expect(playerInserts).toHaveLength(2);
    expect(playerInserts[0]?.[18]).toBe(false);
    expect(playerInserts[0]?.[19]).toBeNull();
    expect(playerInserts[1]?.[18]).toBe(true);
    expect(playerInserts[1]?.[19]).toBe('normal');
  });

  it('inserts is_tutorial (L41-04)', async () => {
    const queries: string[] = [];
    const bound: unknown[][] = [];
    const client = {
      query: vi.fn((sql: string, params?: unknown[]) => {
        queries.push(typeof sql === 'string' ? sql : String(sql));
        if (params !== undefined) {
          bound.push(params);
        }

        if (sql.includes('RETURNING id')) {
          return Promise.resolve({ rows: [{ id: 'game-uuid' }] });
        }

        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(() => Promise.resolve(client)),
    };

    await writeFinishedGame(pool as never, sampleSnapshot());

    expect(queries.some((sql) => sql.includes('is_tutorial'))).toBe(true);
    const gameInsert = bound.find((params) => params.length === 12);
    expect(gameInsert?.[11]).toBe(false);
  });

  it('binds is_tutorial true when the snapshot is a tutorial (L41-04)', async () => {
    const bound: unknown[][] = [];
    const client = {
      query: vi.fn((sql: string, params?: unknown[]) => {
        if (params !== undefined) {
          bound.push(params);
        }

        if (sql.includes('RETURNING id')) {
          return Promise.resolve({ rows: [{ id: 'game-uuid' }] });
        }

        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(() => Promise.resolve(client)),
    };

    await writeFinishedGame(pool as never, { ...sampleSnapshot(), isTutorial: true });

    const gameInsert = bound.find((params) => params.length === 12);
    expect(gameInsert?.[11]).toBe(true);
  });
});

describe('persistFinishedGame (L8-02 watch point)', () => {
  beforeEach(() => {
    resetPoolForTests();
    delete process.env['DATABASE_URL'];
  });

  it('soft-skips when DATABASE_URL is unset and never throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(persistFinishedGame(sampleSnapshot())).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
