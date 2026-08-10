/**
 * Arena runner — technical spec v5 §7.2 (L32-06).
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  HEURISTIC_V4_POLICY_ID,
  RANDOM_LEGAL_POLICY_ID,
} from '../bots/registry';
import { parseArenaArgs } from './arena-config';
import { computeEloDelta, policyAWonGame } from './arena-metrics';
import {
  arenaGameSeed,
  mirroredKitForSeed,
  runArena,
  runArenaWithConfig,
  summaryPathForGames,
} from './run-arena';
import { gameSeed } from './run-batch';
import { wilsonInterval } from './wilson-interval';

describe('wilsonInterval (L32-06)', () => {
  it('returns a symmetric interval around 0.5 for even wins and losses', () => {
    const interval = wilsonInterval(50, 100);
    expect(interval.lower).toBeLessThan(0.5);
    expect(interval.upper).toBeGreaterThan(0.5);
    expect(interval.center).toBeCloseTo(0.5, 5);
  });

  it('contains the observed rate for a lopsided sample', () => {
    const interval = wilsonInterval(80, 100);
    expect(interval.lower).toBeLessThanOrEqual(0.8);
    expect(interval.upper).toBeGreaterThanOrEqual(0.8);
  });
});

describe('arena metrics helpers (L32-06)', () => {
  it('maps winner seat to policy A wins', () => {
    expect(policyAWonGame('bot-0', ['a', 'b'], 'a')).toBe(true);
    expect(policyAWonGame('bot-1', ['a', 'b'], 'a')).toBe(false);
    expect(policyAWonGame('bot-0', ['b', 'a'], 'a')).toBe(false);
    expect(policyAWonGame('bot-1', ['b', 'a'], 'a')).toBe(true);
  });

  it('computes positive Elo delta when A dominates B at equal ratings', () => {
    expect(computeEloDelta(8, 10)).toBeGreaterThan(0);
    expect(computeEloDelta(2, 10)).toBeLessThan(0);
  });
});

describe('simulation arena (L32-06)', () => {
  it('parses required CLI flags', () => {
    const config = parseArenaArgs([
      '--games',
      '20',
      '--policy-a',
      HEURISTIC_V4_POLICY_ID,
      '--policy-b',
      RANDOM_LEGAL_POLICY_ID,
      '--seed',
      'arena-cli',
      '--out',
      '/tmp/arena.jsonl',
      '--kit-modes',
      'mirrored',
    ]);

    expect(config.games).toBe(20);
    expect(config.playerCount).toBe(2);
    expect(config.policyA).toBe(HEURISTIC_V4_POLICY_ID);
    expect(config.policyB).toBe(RANDOM_LEGAL_POLICY_ID);
    expect(config.kitModes).toEqual(['mirrored']);
    expect(arenaGameSeed('arena-cli', 'mirrored', 3, 1)).toBe(
      'arena-cli:mirrored:3:1',
    );
    expect(mirroredKitForSeed('fixed-seed')).toBe(mirroredKitForSeed('fixed-seed'));
    expect(summaryPathForGames('/tmp/arena.jsonl')).toBe(
      '/tmp/arena.arena-summary.json',
    );
  });

  it('A vs A win-rate Wilson interval contains 0.5', async () => {
    const result = await runArenaWithConfig(
      {
        games: 12,
        playerCount: 2,
        policyA: HEURISTIC_V4_POLICY_ID,
        policyB: HEURISTIC_V4_POLICY_ID,
        baseSeed: 'l18-04-smoke-easy',
        difficulty: 'easy',
        kitModes: ['mirrored'],
        outPath: path.join(tmpdir(), 'unused-arena-self-play.jsonl'),
      },
      { maxTurns: 2500 },
    );

    const mirrored = result.reports[0];

    expect(mirrored).toBeDefined();
    expect(mirrored?.completedGames).toBeGreaterThan(0);
    expect(mirrored?.winRate).toBe(0.5);
    expect(mirrored?.eloDelta).toBe(0);
    expect(mirrored?.wilsonInterval.lower).toBeLessThanOrEqual(0.5);
    expect(mirrored?.wilsonInterval.upper).toBeGreaterThanOrEqual(0.5);
    expect(mirrored?.policyA.weightsHash).toBe(mirrored?.policyB.weightsHash);
  });

  it('same base seed and config → byte-identical games JSONL and summary', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-arena-'));
    const outA = path.join(dir, 'a.jsonl');
    const outB = path.join(dir, 'b.jsonl');
    const config = {
      games: 2,
      playerCount: 2 as const,
      policyA: HEURISTIC_V4_POLICY_ID,
      policyB: RANDOM_LEGAL_POLICY_ID,
      baseSeed: 'l32-06-byte',
      difficulty: 'easy' as const,
      kitModes: ['mirrored', 'random'] as const,
      outPath: outA,
    };

    try {
      const aResult = await runArenaWithConfig(config);
      const bResult = await runArenaWithConfig({ ...config, outPath: outB });
      const gamesA = await readFile(outA, 'utf8');
      const gamesB = await readFile(outB, 'utf8');
      const summaryA = await readFile(summaryPathForGames(outA), 'utf8');
      const summaryB = await readFile(summaryPathForGames(outB), 'utf8');

      expect(gamesA).toBe(gamesB);
      expect(summaryA).toBe(summaryB);
      expect(aResult.gamesBody).toBe(bResult.gamesBody);
      expect(aResult.summaryBody).toBe(bResult.summaryBody);
      expect(gamesA.trimEnd().split('\n')).toHaveLength(aResult.completed);
      expect(aResult.completed).toBe(config.games * 2 * config.kitModes.length);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('plays both seat orientations for every base seed', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-arena-seats-'));
    const out = path.join(dir, 'seats.jsonl');

    try {
      const result = await runArenaWithConfig({
        games: 3,
        playerCount: 2,
        policyA: HEURISTIC_V4_POLICY_ID,
        policyB: RANDOM_LEGAL_POLICY_ID,
        baseSeed: 'l32-06-seats',
        difficulty: 'easy',
        kitModes: ['random'],
        outPath: out,
      });

      expect(result.completed).toBe(6);
      const seeds = (await readFile(out, 'utf8'))
        .trimEnd()
        .split('\n')
        .map((line) => JSON.parse(line) as { seed: string })
        .map((row) => row.seed);

      expect(seeds).toEqual([
        arenaGameSeed('l32-06-seats', 'random', 0, 0),
        arenaGameSeed('l32-06-seats', 'random', 0, 1),
        arenaGameSeed('l32-06-seats', 'random', 1, 0),
        arenaGameSeed('l32-06-seats', 'random', 1, 1),
        arenaGameSeed('l32-06-seats', 'random', 2, 0),
        arenaGameSeed('l32-06-seats', 'random', 2, 1),
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('CLI wrapper accepts pnpm-style bare -- separator', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-arena-cli-'));
    const out = path.join(dir, 'cli.jsonl');

    try {
      const result = await runArena([
        '--',
        '--games',
        '1',
        '--policy-a',
        HEURISTIC_V4_POLICY_ID,
        '--policy-b',
        RANDOM_LEGAL_POLICY_ID,
        '--seed',
        gameSeed('arena-pnpm', 0),
        '--out',
        out,
        '--kit-modes',
        'mirrored',
        '--difficulty',
        'easy',
      ]);

      expect(result.completed).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
