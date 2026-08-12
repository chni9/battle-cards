/**
 * L34-06 calibration harness smoke — impossible rate must be 0 on a tiny run.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  formatWriteup,
  main,
  runBenchDeterminizer,
} from './bench-determinizer';

describe('bench-determinizer (L34-06)', () => {
  it('reports zero impossible worlds on a tiny seeded run', () => {
    const result = runBenchDeterminizer({
      games: 2,
      samplesPerDecision: 2,
      seed: 'l34-06-smoke',
      outDir: null,
    });

    expect(result.impossibleRate).toBe(0);
    expect(result.totals.worlds).toBeGreaterThan(0);
    expect(result.totals.decisions).toBeGreaterThan(0);
    expect(formatWriteup(result)).toContain('Impossible worlds');
  });

  it('writes publish artifacts via CLI main', () => {
    const dir = mkdtempSync(join(tmpdir(), 'l34-06-'));

    try {
      main([
        '--games',
        '1',
        '--k',
        '1',
        '--seed',
        'l34-06-write',
        '--out',
        dir,
      ]);
      const writeup = readFileSync(join(dir, 'WRITEUP.md'), 'utf8');
      expect(writeup).toContain('Accuracy vs turn number');
      expect(writeup).toContain('concludes nothing about balance');
      expect(readFileSync(join(dir, 'aggregates.json'), 'utf8')).toContain(
        'impossibleRate',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
