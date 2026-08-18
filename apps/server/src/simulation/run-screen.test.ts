/**
 * Screen runner config + stall attribution — Lot 31.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runScreen } from './run-screen';
import {
  ORIGINAL_V3_KIT_IDS,
  buildCoverageNote,
  parseScreenArgs,
  unorderedPairs,
} from './screen-config';

describe('screen-config (Lot 31)', () => {
  it('pins ORIGINAL_V3_KIT_IDS to the four V3 kits', () => {
    expect([...ORIGINAL_V3_KIT_IDS]).toEqual([
      'untouchable',
      'kamikaze',
      'scientific',
      'assassin',
    ]);
  });

  it('parses kits, games-per-cell, and random 4p defaults', () => {
    const config = parseScreenArgs([
      '--kits',
      'assassin,kamikaze',
      '--games-per-cell',
      '3',
      '--seed',
      'screen-test',
      '--out',
      '/tmp/screen-out',
      '--four-player-mode',
      'random',
      '--four-player-games',
      '5',
    ]);

    expect(config.oneVOneKits).toEqual(['assassin', 'kamikaze']);
    expect(config.gamesPerCell).toBe(3);
    expect(config.fourPlayer).toEqual({ mode: 'random', games: 5 });
    expect(config.policyId).toBe('heuristic-v4');
    expect(config.weightsProfile).toBeNull();
    expect(config.searchIterations).toBe(1);
    expect(config.coverageNote).toContain('1v1: 1 unordered pairs');
    expect(config.coverageNote).toContain('random-with-replacement');
    expect(config.undersampledCardThreshold).toBe(100);
  });

  it('rejects an unknown policy id', () => {
    expect(() =>
      parseScreenArgs(['--policy', 'not-a-policy', '--out', '/tmp/x']),
    ).toThrow(/Unknown --policy/);
  });

  it('rejects an unknown weights profile', () => {
    expect(() =>
      parseScreenArgs([
        '--policy',
        'search-v5',
        '--weights-profile',
        'no-such-profile',
        '--out',
        '/tmp/x',
      ]),
    ).toThrow(/Unknown --weights-profile/);
  });

  it('defaults search-iterations to 64 for search-v5', () => {
    const config = parseScreenArgs([
      '--policy',
      'search-v5',
      '--kits',
      'assassin,kamikaze',
      '--out',
      '/tmp/x',
    ]);
    expect(config.policyId).toBe('search-v5');
    expect(config.searchIterations).toBe(64);
  });

  it('requires a 4-kit mix for fixed four-player mode', () => {
    expect(() =>
      parseScreenArgs([
        '--kits',
        'assassin,kamikaze',
        '--four-player-mode',
        'fixed',
        '--out',
        '/tmp/x',
      ]),
    ).toThrow(/four-player-mix/);
  });

  it('rejects duplicate kits', () => {
    expect(() =>
      parseScreenArgs(['--kits', 'assassin,assassin', '--out', '/tmp/x']),
    ).toThrow(/duplicates/);
  });

  it('buildCoverageNote states games-per-cell and 4p mode', () => {
    const note = buildCoverageNote({
      baseSeed: 's',
      gamesPerCell: 200,
      difficulty: 'hard',
      oneVOneKits: ['assassin', 'kamikaze'],
      fourPlayer: { mode: 'random', games: 2000 },
      outDir: '/tmp',
      undersampledCardThreshold: 100,
      policyId: 'heuristic-v4',
      weightsProfile: null,
      searchIterations: 1,
      concurrency: 1,
    });

    expect(note).toContain('200 games');
    expect(note).toContain('2000 random-with-replacement');
    expect(note).toContain('N=100');
    expect(note).toContain('Policy heuristic-v4');
    expect(note).toContain('Coverage dropped relative to V4');
  });

  it('unorderedPairs yields C(n,2)', () => {
    expect(unorderedPairs([...ORIGINAL_V3_KIT_IDS])).toHaveLength(6);
  });
});

describe('runScreen (Lot 31)', () => {
  it('same config → identical aggregates and JSONL', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-'));
    const outA = path.join(dir, 'a');
    const outB = path.join(dir, 'b');

    const argvBase = [
      '--kits',
      'assassin,kamikaze',
      '--games-per-cell',
      '2',
      '--seed',
      'l31-det',
      '--four-player-mode',
      'fixed',
      '--four-player-mix',
      'untouchable,kamikaze,scientific,assassin',
      '--four-player-games',
      '1',
    ] as const;

    try {
      const a = await runScreen(parseScreenArgs([...argvBase, '--out', outA]), {
        quiet: true,
      });
      const b = await runScreen(parseScreenArgs([...argvBase, '--out', outB]), {
        quiet: true,
      });

      expect(await readFile(path.join(outA, 'games.jsonl'), 'utf8')).toBe(
        await readFile(path.join(outB, 'games.jsonl'), 'utf8'),
      );
      expect(JSON.stringify(a.report)).toBe(JSON.stringify(b.report));
      expect(a.report.stallsByMatchup['assassin_vs_kamikaze']).toBeDefined();
      const configJson = JSON.parse(
        await readFile(path.join(outA, 'config.json'), 'utf8'),
      ) as {
        coverageNote: string;
        policyId: string;
        policyWeightsHash: string;
        resolvedWeightsHash: string;
        searchIterations: number;
        weightsProfile: string | null;
      };
      expect(configJson.coverageNote).toContain('fixed mix');
      expect(configJson.policyId).toBe('heuristic-v4');
      expect(configJson.searchIterations).toBe(1);
      expect(configJson.weightsProfile).toBeNull();
      expect(configJson.policyWeightsHash).toMatch(/^[0-9a-f]{16}$/);
      expect(configJson.resolvedWeightsHash).toBe(configJson.policyWeightsHash);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('records stall ledger keys when MAX_TURNS is forced', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-stall-'));

    try {
      const result = await runScreen(
        parseScreenArgs([
          '--kits',
          'assassin,kamikaze',
          '--games-per-cell',
          '2',
          '--seed',
          'l31-stall',
          '--out',
          dir,
          '--four-player-mode',
          'fixed',
          '--four-player-mix',
          'untouchable,kamikaze,scientific,assassin',
          '--four-player-games',
          '1',
        ]),
        { maxTurns: 1, quiet: true },
      );

      expect(result.report.completedGames).toBe(0);
      expect(result.report.stalledGames).toBe(3);
      // 2×1v1 + 1×4p fixed mix (all four V3 kits seated once).
      expect(result.report.stallsByKit['assassin']?.stalledGames).toBe(3);
      expect(result.report.stallsByKit['kamikaze']?.stalledGames).toBe(3);
      expect(result.report.stallsByKit['untouchable']?.stalledGames).toBe(1);
      expect(
        result.report.stallsByMatchup['assassin_vs_kamikaze']?.stalledGames,
      ).toBe(2);
      expect(
        result.report.stallsByMatchup['assassin_vs_kamikaze']?.attemptedGames,
      ).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('random 4p omits kitAssignment and still attributes stalls', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-rand-'));

    try {
      const result = await runScreen(
        parseScreenArgs([
          '--kits',
          'assassin,kamikaze',
          '--games-per-cell',
          '1',
          '--seed',
          'l31-rand4p',
          '--out',
          dir,
          '--four-player-mode',
          'random',
          '--four-player-games',
          '2',
        ]),
        { maxTurns: 1, quiet: true },
      );

      expect(result.report.stalledGames).toBe(3);
      expect(Object.keys(result.report.stallsByKit).length).toBeGreaterThan(0);
      const configJson = JSON.parse(
        await readFile(path.join(dir, 'config.json'), 'utf8'),
      ) as { coverageNote: string; fourPlayer: { mode: string } };
      expect(configJson.fourPlayer.mode).toBe('random');
      expect(configJson.coverageNote).toContain('random-with-replacement');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('search-v5 at 2 iterations: same seed → byte-identical JSONL (L38-01)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-s5-'));
    const outA = path.join(dir, 'a');
    const outB = path.join(dir, 'b');
    const argvBase = [
      '--kits',
      'assassin,kamikaze',
      '--games-per-cell',
      '1',
      '--seed',
      'l38-s5-det',
      '--four-player-mode',
      'fixed',
      '--four-player-mix',
      'untouchable,kamikaze,scientific,assassin',
      '--four-player-games',
      '1',
      '--policy',
      'search-v5',
      '--search-iterations',
      '2',
      '--concurrency',
      '1',
    ] as const;

    try {
      await runScreen(parseScreenArgs([...argvBase, '--out', outA]), {
        quiet: true,
      });
      await runScreen(parseScreenArgs([...argvBase, '--out', outB]), {
        quiet: true,
      });

      expect(await readFile(path.join(outA, 'games.jsonl'), 'utf8')).toBe(
        await readFile(path.join(outB, 'games.jsonl'), 'utf8'),
      );
      const configJson = JSON.parse(
        await readFile(path.join(outA, 'config.json'), 'utf8'),
      ) as {
        policyId: string;
        searchIterations: number;
        policyWeightsHash: string;
        resolvedWeightsHash: string;
      };
      expect(configJson.policyId).toBe('search-v5');
      expect(configJson.searchIterations).toBe(2);
      expect(configJson.policyWeightsHash).toBe(configJson.resolvedWeightsHash);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
