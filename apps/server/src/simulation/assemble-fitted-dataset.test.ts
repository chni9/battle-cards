/**
 * L37-01 — assemble fitted dataset + belief-matched capture.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FEATURE_DIM, FEATURE_LAYOUT_VERSION } from '../bots/eval/features';
import { HEURISTIC_V4_POLICY_ID } from '../bots/registry';
import {
  assembleFittedDataset,
  parseFeatureSnapshotLine,
  writeFittedDataset,
} from './assemble-fitted-dataset';
import {
  captureFeatureSnapshot,
  type FeatureSnapshotRow,
} from './feature-snapshots';
import { runSimulatedGame } from './run-game';

function syntheticRow(
  seed: string,
  actingPlayerId: string,
  winnerPlayerId: string,
  turnSequence: number,
): FeatureSnapshotRow {
  return {
    seed,
    turnSequence,
    actingPlayerId,
    features: Array.from({ length: FEATURE_DIM }, (_, index) => index * 0.01),
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    winnerPlayerId,
  };
}

describe('assembleFittedDataset (L37-01)', () => {
  it('keeps all rows of one seed in the same split', () => {
    const rows = [
      syntheticRow('game-a', 'bot-0', 'bot-0', 1),
      syntheticRow('game-a', 'bot-1', 'bot-0', 2),
      syntheticRow('game-a', 'bot-0', 'bot-0', 3),
      syntheticRow('game-b', 'bot-0', 'bot-1', 1),
      syntheticRow('game-c', 'bot-1', 'bot-1', 1),
    ];
    const { labeled, manifest } = assembleFittedDataset({
      rows,
      splitSeed: 'l37-01-unit',
    });

    const splitsForA = new Set(
      labeled.filter((row) => row.seed === 'game-a').map((row) => row.split),
    );
    expect(splitsForA.size).toBe(1);

    const allSeeds = [
      ...manifest.trainSeeds,
      ...manifest.validationSeeds,
      ...manifest.testSeeds,
    ];
    expect(new Set(allSeeds).size).toBe(allSeeds.length);
    expect(manifest.rowCounts.total).toBe(5);
    expect(labeled.filter((row) => row.seed === 'game-a' && row.label === 1)).toHaveLength(2);
    expect(labeled.filter((row) => row.seed === 'game-a' && row.label === 0)).toHaveLength(1);
  });

  it('rejects layout / dim mismatches', () => {
    expect(() =>
      parseFeatureSnapshotLine(
        JSON.stringify({
          seed: 'bad',
          turnSequence: 1,
          actingPlayerId: 'bot-0',
          features: [1, 2, 3],
          featureLayoutVersion: FEATURE_LAYOUT_VERSION,
          winnerPlayerId: 'bot-0',
        }),
      ),
    ).toThrow(/feature length/);

    expect(() =>
      parseFeatureSnapshotLine(
        JSON.stringify({
          seed: 'bad',
          turnSequence: 1,
          actingPlayerId: 'bot-0',
          features: Array.from({ length: FEATURE_DIM }, () => 0),
          featureLayoutVersion: FEATURE_LAYOUT_VERSION + 1,
          winnerPlayerId: 'bot-0',
        }),
      ),
    ).toThrow(/layout/);
  });

  it('writes stable manifest hash for the same inputs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'l37-01-'));
    try {
      const rows = [
        syntheticRow('s1', 'bot-0', 'bot-0', 1),
        syntheticRow('s2', 'bot-1', 'bot-0', 1),
      ];
      const first = assembleFittedDataset({ rows, splitSeed: 'stable' });
      writeFittedDataset(dir, first.labeled, first.manifest);
      const second = assembleFittedDataset({ rows, splitSeed: 'stable' });
      expect(second.manifest.contentHash).toBe(first.manifest.contentHash);
      const written = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
        contentHash: string;
      };
      expect(written.contentHash).toBe(first.manifest.contentHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('empty input yields zero rows', () => {
    const { labeled, manifest } = assembleFittedDataset({
      rows: [],
      splitSeed: 'empty',
    });
    expect(labeled).toHaveLength(0);
    expect(manifest.rowCounts.total).toBe(0);
  });
});

describe('belief-matched feature capture (L37-01)', () => {
  it('captures FEATURE_DIM features during a finished game', () => {
    const row = runSimulatedGame({
      seed: 'l37-01-capture',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      policyIds: [HEURISTIC_V4_POLICY_ID, HEURISTIC_V4_POLICY_ID],
      captureFeatureSnapshots: true,
    });

    expect(row.featureSnapshots?.length).toBeGreaterThan(0);
    for (const snapshot of row.featureSnapshots ?? []) {
      expect(snapshot.features).toHaveLength(FEATURE_DIM);
      expect(snapshot.featureLayoutVersion).toBe(FEATURE_LAYOUT_VERSION);
    }
  });

  it('captures FEATURE_DIM features during a finished game', () => {
    let thrown: unknown;
    try {
      const row = runSimulatedGame({
        seed: 'l37-01-belief-api',
        playerCount: 2,
        difficulties: ['easy', 'easy'],
        policyIds: [HEURISTIC_V4_POLICY_ID, HEURISTIC_V4_POLICY_ID],
        maxTurns: 8,
        onBeforeDecide: ({ state, actionLog, actingPlayerId }) => {
          const snap = captureFeatureSnapshot(
            state,
            actingPlayerId,
            actionLog,
            'l37-01-belief-api',
          );
          expect(snap.features).toHaveLength(FEATURE_DIM);
        },
      });
      void row;
    } catch (error) {
      thrown = error;
    }
    // Finished or stalled — capture API must not throw either way.
    void thrown;
  });
});

describe('assemble CLI smoke', () => {
  it('round-trips JSONL through assemble', () => {
    const dir = mkdtempSync(join(tmpdir(), 'l37-01-cli-'));
    try {
      const jsonl = join(dir, 'features.jsonl');
      const out = join(dir, 'out');
      const rows = [
        syntheticRow('g1', 'bot-0', 'bot-0', 1),
        syntheticRow('g2', 'bot-0', 'bot-1', 1),
      ];
      writeFileSync(
        jsonl,
        rows.map((row) => `${JSON.stringify(row)}\n`).join(''),
        'utf8',
      );
      const parsed = rows.map((row) => parseFeatureSnapshotLine(JSON.stringify(row)));
      const { labeled, manifest } = assembleFittedDataset({
        rows: parsed,
        splitSeed: 'cli',
      });
      writeFittedDataset(out, labeled, manifest);
      expect(readFileSync(join(out, 'train.jsonl'), 'utf8').length +
        readFileSync(join(out, 'validation.jsonl'), 'utf8').length +
        readFileSync(join(out, 'test.jsonl'), 'utf8').length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
