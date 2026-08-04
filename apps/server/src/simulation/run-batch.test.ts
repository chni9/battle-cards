/**
 * Batch runner determinism — technical spec v3 §8 (L18-04).
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseBatchArgs } from './batch-config';
import { gameSeed, runBatch } from './run-batch';
import { runSimulatedGame } from './run-game';

describe('simulation batch (L18-04)', () => {
  it('parses required CLI flags', () => {
    const config = parseBatchArgs([
      '--games',
      '10',
      '--players',
      '2',
      '--difficulties',
      'hard,normal',
      '--seed',
      'demo',
      '--kits',
      'assassin,kamikaze',
      '--out',
      '/tmp/out.jsonl',
    ]);

    expect(config.games).toBe(10);
    expect(config.playerCount).toBe(2);
    expect(config.difficulties).toEqual(['hard', 'normal']);
    expect(config.kitAssignment).toEqual(['assassin', 'kamikaze']);
    expect(gameSeed('demo', 3)).toBe('demo:3');
  });

  it('ignores a bare -- forwarded by pnpm', () => {
    const config = parseBatchArgs([
      '--',
      '--games',
      '2',
      '--players',
      '2',
      '--difficulties',
      'hard,hard',
      '--seed',
      'pnpm-sep',
      '--out',
      '/tmp/out.jsonl',
    ]);

    expect(config.games).toBe(2);
    expect(config.baseSeed).toBe('pnpm-sep');
  });

  it('same base seed and config → byte-identical JSONL', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-sim-'));
    const outA = path.join(dir, 'a.jsonl');
    const outB = path.join(dir, 'b.jsonl');
    const argv = [
      '--games',
      '2',
      '--players',
      '2',
      '--difficulties',
      'hard,hard',
      '--seed',
      'l18-04-byte',
      '--kits',
      'assassin,kamikaze',
      '--out',
    ] as const;

    try {
      const aResult = await runBatch([...argv, outA]);
      const bResult = await runBatch([...argv, outB]);
      const a = await readFile(outA, 'utf8');
      const b = await readFile(outB, 'utf8');
      expect(a).toBe(b);
      expect(aResult.body).toBe(bResult.body);
      expect(a.trimEnd().split('\n')).toHaveLength(aResult.completed);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('skips stalled hard games and still writes completed rows', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-sim-stall-'));
    const out = path.join(dir, 'out.jsonl');

    try {
      // Force MAX_TURNS via a tiny cap — policy changes can clear natural stall seeds.
      const result = await runBatch(
        [
          '--games',
          '3',
          '--players',
          '2',
          '--difficulties',
          'hard,hard',
          '--seed',
          'force-stall-batch',
          '--kits',
          'assassin,kamikaze',
          '--out',
          out,
        ],
        { maxTurns: 1 },
      );

      expect(result.stalled).toBe(3);
      expect(result.completed).toBe(0);
      expect(result.stalledSeeds).toEqual([
        'force-stall-batch:0',
        'force-stall-batch:1',
        'force-stall-batch:2',
      ]);
      const file = await readFile(out, 'utf8');
      expect(file).toBe('');
      expect(file).toBe(result.body);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('smoke: 50 games complete with no throw', () => {
    // Hard self-play can stall (Untouchable / invest loops) — §8.3 hang signal.
    // Easy noise finishes reliably for the CI smoke gate.
    for (let index = 0; index < 50; index += 1) {
      const row = runSimulatedGame({
        seed: gameSeed('l18-04-smoke-easy', index),
        playerCount: 4,
        difficulties: ['easy', 'easy', 'easy', 'easy'],
      });
      expect(row.winnerPlayerId).toBeTruthy();
      expect(row.seatCount).toBe(4);
    }
  });
});
