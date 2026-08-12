/**
 * Belief / determinizer calibration — technical spec v5 §7.4 (L34-06).
 *
 * Run via pnpm only (devEngines-pinned Node):
 *   `pnpm --filter @card-battle/server bench:determinizer`
 *
 * Ground truth is available in the simulator. Sample K worlds per decision and
 * report kit top-1 / top-3 vs turn index, life MAE, hand precision/recall, and
 * the impossible-world rate (must be 0). Publishes under
 * `docs/simulation/<date>-v5-belief/` — concludes nothing about balance.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KIT_IDS,
  type CardId,
  type CardInstance,
  type GameState,
  type KitId,
  type PlayingStateView,
} from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { runSimulatedGame } from '../../simulation/run-game';
import { determinizeFromView, inferBelief } from './determinize';
import { isUniquenessGuaranteedKit } from './kit-uniqueness';

const DEFAULT_GAMES = 40;
const DEFAULT_K = 8;
const DEFAULT_SEED = 'l34-06-belief-calib';
const PLAYER_COUNT = 4;

export interface BenchDeterminizerConfig {
  readonly games: number;
  readonly samplesPerDecision: number;
  readonly seed: string;
  readonly outDir: string | null;
}

export interface TurnBucketStats {
  decisions: number;
  kitObservations: number;
  kitTop1Hits: number;
  kitTop3Hits: number;
  uniquenessTop1Hits: number;
  uniquenessDecisions: number;
  lifeAbsErrorSum: number;
  lifeSamples: number;
  handPrecisionSum: number;
  handRecallSum: number;
  handSamples: number;
  impossible: number;
  worlds: number;
}

export interface BenchDeterminizerResult {
  readonly config: BenchDeterminizerConfig;
  readonly gamesCompleted: number;
  readonly gamesStalled: number;
  readonly byTurnBucket: Readonly<Record<string, TurnBucketStats>>;
  readonly totals: TurnBucketStats;
  readonly impossibleRate: number;
}

function emptyBucket(): TurnBucketStats {
  return {
    decisions: 0,
    kitObservations: 0,
    kitTop1Hits: 0,
    kitTop3Hits: 0,
    uniquenessTop1Hits: 0,
    uniquenessDecisions: 0,
    lifeAbsErrorSum: 0,
    lifeSamples: 0,
    handPrecisionSum: 0,
    handRecallSum: 0,
    handSamples: 0,
    impossible: 0,
    worlds: 0,
  };
}

function turnBucket(turnSequence: number): string {
  if (turnSequence < 10) {
    return '0-9';
  }

  if (turnSequence < 30) {
    return '10-29';
  }

  if (turnSequence < 60) {
    return '30-59';
  }

  if (turnSequence < 100) {
    return '60-99';
  }

  return '100+';
}

function actionKey(action: unknown): string {
  return JSON.stringify(action);
}

function sortedKeys(actions: readonly unknown[]): string[] {
  return actions.map(actionKey).sort((left, right) => left.localeCompare(right));
}

function cardIdMultiset(cards: readonly CardInstance[]): Map<CardId, number> {
  const counts = new Map<CardId, number>();

  for (const card of cards) {
    counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
  }

  return counts;
}

function precisionRecall(
  predicted: readonly CardInstance[],
  truth: readonly CardInstance[],
): { precision: number; recall: number } {
  const pred = cardIdMultiset(predicted);
  const real = cardIdMultiset(truth);
  let overlap = 0;
  let predTotal = 0;
  let realTotal = 0;

  for (const [cardId, count] of pred) {
    predTotal += count;
    overlap += Math.min(count, real.get(cardId) ?? 0);
  }

  for (const count of real.values()) {
    realTotal += count;
  }

  return {
    precision: predTotal === 0 ? 1 : overlap / predTotal,
    recall: realTotal === 0 ? 1 : overlap / realTotal,
  };
}

function topKitIds(posterior: Readonly<Record<KitId, number>>, n: number): KitId[] {
  return [...KIT_IDS]
    .map((kitId) => ({ kitId, mass: posterior[kitId] }))
    .sort((left, right) => right.mass - left.mass)
    .slice(0, n)
    .map((entry) => entry.kitId);
}

function publicFieldsAgree(world: GameState, view: PlayingStateView): boolean {
  if (world.currentTurnPlayerId !== view.currentTurnPlayerId) {
    return false;
  }

  if (world.turnSequence !== view.turnSequence) {
    return false;
  }

  if (world.pool.length !== view.pool.length) {
    return false;
  }

  for (let index = 0; index < view.pool.length; index += 1) {
    const left = world.pool[index];
    const right = view.pool[index];

    if (
      left === undefined ||
      right?.instanceId !== left.instanceId ||
      right.cardId !== left.cardId
    ) {
      return false;
    }
  }

  const self = world.players.find((player) => player.id === view.you);

  if (self === undefined) {
    return false;
  }

  if (self.kitId !== view.self.kitId || self.lives !== view.self.lives) {
    return false;
  }

  return true;
}

function isImpossibleWorld(
  world: GameState,
  real: GameState,
  view: PlayingStateView,
  actingPlayerId: string,
): boolean {
  if (!publicFieldsAgree(world, view)) {
    return true;
  }

  const fromWorld = sortedKeys(listLegalActions(world, actingPlayerId));
  const fromReal = sortedKeys(listLegalActions(real, actingPlayerId));
  return fromWorld.join('\n') !== fromReal.join('\n');
}

function accumulate(bucket: TurnBucketStats, partial: TurnBucketStats): void {
  bucket.decisions += partial.decisions;
  bucket.kitObservations += partial.kitObservations;
  bucket.kitTop1Hits += partial.kitTop1Hits;
  bucket.kitTop3Hits += partial.kitTop3Hits;
  bucket.uniquenessTop1Hits += partial.uniquenessTop1Hits;
  bucket.uniquenessDecisions += partial.uniquenessDecisions;
  bucket.lifeAbsErrorSum += partial.lifeAbsErrorSum;
  bucket.lifeSamples += partial.lifeSamples;
  bucket.handPrecisionSum += partial.handPrecisionSum;
  bucket.handRecallSum += partial.handRecallSum;
  bucket.handSamples += partial.handSamples;
  bucket.impossible += partial.impossible;
  bucket.worlds += partial.worlds;
}

function scoreDecision(
  state: GameState,
  view: PlayingStateView,
  actionLog: readonly import('@card-battle/shared').ActionLogEntryView[],
  actingPlayerId: string,
  samplesPerDecision: number,
  seed: string,
): TurnBucketStats {
  const stats = emptyBucket();
  stats.decisions = 1;
  const belief = inferBelief(view, actionLog);

  for (const opponent of state.players) {
    if (opponent.id === actingPlayerId || opponent.isEliminated) {
      continue;
    }

    const posterior = belief.kitPosteriorByOpponentId[opponent.id];

    if (posterior === undefined) {
      continue;
    }

    const top1 = topKitIds(posterior, 1)[0];
    const top3 = topKitIds(posterior, 3);
    const truthKit = opponent.kitId;

    stats.kitObservations += 1;

    if (top1 === truthKit) {
      stats.kitTop1Hits += 1;
    }

    if (top3.includes(truthKit)) {
      stats.kitTop3Hits += 1;
    }

    if (isUniquenessGuaranteedKit(truthKit)) {
      stats.uniquenessDecisions += 1;

      if (top1 === truthKit) {
        stats.uniquenessTop1Hits += 1;
      }
    }

    const resources = belief.resourcesByOpponentId[opponent.id];

    if (resources !== undefined) {
      const mid = (resources.lives.lo + resources.lives.hi) / 2;
      stats.lifeAbsErrorSum += Math.abs(mid - opponent.lives);
      stats.lifeSamples += 1;
    }
  }

  for (let sampleIndex = 0; sampleIndex < samplesPerDecision; sampleIndex += 1) {
    const world = determinizeFromView(
      view,
      actionLog,
      createRng(`${seed}:world:${actingPlayerId}:${String(view.turnSequence)}:${String(sampleIndex)}`),
    );
    stats.worlds += 1;

    if (isImpossibleWorld(world, state, view, actingPlayerId)) {
      stats.impossible += 1;
    }

    for (const opponent of state.players) {
      if (opponent.id === actingPlayerId || opponent.isEliminated) {
        continue;
      }

      const guessed = world.players.find((player) => player.id === opponent.id);

      if (guessed === undefined) {
        continue;
      }

      const handScore = precisionRecall(
        [...guessed.hand, ...guessed.specialCards],
        [...opponent.hand, ...opponent.specialCards],
      );
      stats.handPrecisionSum += handScore.precision;
      stats.handRecallSum += handScore.recall;
      stats.handSamples += 1;
    }
  }

  return stats;
}

export function runBenchDeterminizer(
  config: BenchDeterminizerConfig,
): BenchDeterminizerResult {
  const byTurnBucket: Record<string, TurnBucketStats> = {};
  const totals = emptyBucket();
  let gamesCompleted = 0;
  let gamesStalled = 0;

  for (let gameIndex = 0; gameIndex < config.games; gameIndex += 1) {
    const gameSeed = `${config.seed}:g${String(gameIndex)}`;

    try {
      runSimulatedGame({
        seed: gameSeed,
        playerCount: PLAYER_COUNT,
        difficulties: ['hard', 'hard', 'hard', 'hard'],
        onBeforeDecide: ({ state, view, actionLog, actingPlayerId }) => {
          const partial = scoreDecision(
            state,
            view,
            actionLog,
            actingPlayerId,
            config.samplesPerDecision,
            gameSeed,
          );
          const bucketKey = turnBucket(view.turnSequence);
          const bucket = byTurnBucket[bucketKey] ?? emptyBucket();
          accumulate(bucket, partial);
          byTurnBucket[bucketKey] = bucket;
          accumulate(totals, partial);
        },
      });

      gamesCompleted += 1;
    } catch (error) {
      if (error instanceof Error && error.message.includes('MAX_TURNS')) {
        gamesStalled += 1;
        continue;
      }

      throw error;
    }
  }

  const impossibleRate =
    totals.worlds === 0 ? 0 : totals.impossible / totals.worlds;

  return {
    config,
    gamesCompleted,
    gamesStalled,
    byTurnBucket,
    totals,
    impossibleRate,
  };
}

function rate(hits: number, total: number): number | null {
  if (total === 0) {
    return null;
  }

  return hits / total;
}

function mean(sum: number, total: number): number | null {
  if (total === 0) {
    return null;
  }

  return sum / total;
}

function formatRate(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return value.toFixed(3);
}

export function formatWriteup(result: BenchDeterminizerResult): string {
  const { totals, byTurnBucket, config, impossibleRate } = result;
  const bucketKeys = ['0-9', '10-29', '30-59', '60-99', '100+'].filter(
    (key) => byTurnBucket[key] !== undefined,
  );

  const lines: string[] = [
    '# Belief calibration (L34-06)',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    '**Task:** L34-06',
    '',
    '## What was measured',
    '',
    'Determinizations from `determinizeFromView` against simulator ground truth.',
    'Kit posteriors scored from `inferBelief` (MAP / top-3). Life error uses the',
    'midpoint of the reconstructed life interval. Hand scores are card-id multiset',
    'precision/recall on sampled worlds (hand + specials).',
    '',
    '**This writeup concludes nothing about balance and changes no value.**',
    '',
    '## Config',
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| Games | ${String(config.games)} |`,
    `| Players | ${String(PLAYER_COUNT)} |`,
    `| K samples / decision | ${String(config.samplesPerDecision)} |`,
    `| Base seed | \`${config.seed}\` |`,
    `| Completed / stalled | ${String(result.gamesCompleted)} / ${String(result.gamesStalled)} |`,
    '',
    '## Impossible worlds',
    '',
    `Rate: **${impossibleRate.toFixed(6)}** (${String(totals.impossible)} / ${String(totals.worlds)}).`,
    'Acceptance requires **0**.',
    '',
    '## Accuracy vs turn number',
    '',
    'Blind early, then collapse where public tells uniquely identify a kit',
    '(`UNIQUENESS_GUARANTEED_KIT_IDS`). Prophet / shared-special cases may keep',
    'multi-kit support by design (designer A / L34-02).',
    '',
    '| Turn bucket | Decisions | Kit top-1 | Kit top-3 | Uniq top-1 | Life MAE | Hand P | Hand R |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];

  for (const key of bucketKeys) {
    const bucket = byTurnBucket[key];

    if (bucket === undefined) {
      continue;
    }

    lines.push(
      `| ${key} | ${String(bucket.decisions)} | ${formatRate(rate(bucket.kitTop1Hits, bucket.kitObservations))} | ${formatRate(rate(bucket.kitTop3Hits, bucket.kitObservations))} | ${formatRate(rate(bucket.uniquenessTop1Hits, bucket.uniquenessDecisions))} | ${formatRate(mean(bucket.lifeAbsErrorSum, bucket.lifeSamples))} | ${formatRate(mean(bucket.handPrecisionSum, bucket.handSamples))} | ${formatRate(mean(bucket.handRecallSum, bucket.handSamples))} |`,
    );
  }

  lines.push(
    '',
    '## Totals',
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| Decisions | ${String(totals.decisions)} |`,
    `| Kit top-1 | ${formatRate(rate(totals.kitTop1Hits, totals.kitObservations))} |`,
    `| Kit top-3 | ${formatRate(rate(totals.kitTop3Hits, totals.kitObservations))} |`,
    `| Uniqueness top-1 | ${formatRate(rate(totals.uniquenessTop1Hits, totals.uniquenessDecisions))} |`,
    `| Life MAE | ${formatRate(mean(totals.lifeAbsErrorSum, totals.lifeSamples))} |`,
    `| Hand precision | ${formatRate(mean(totals.handPrecisionSum, totals.handSamples))} |`,
    `| Hand recall | ${formatRate(mean(totals.handRecallSum, totals.handSamples))} |`,
    `| Impossible rate | ${impossibleRate.toFixed(6)} |`,
    '',
    '## Reproduction',
    '',
    '```bash',
    'pnpm --filter @card-battle/server bench:determinizer -- --games 40 --k 8 --seed l34-06-belief-calib --out docs/simulation/2026-08-12-v5-belief',
    '```',
    '',
    'Same seed + config → identical aggregates.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv: readonly string[]): BenchDeterminizerConfig {
  let games = DEFAULT_GAMES;
  let samplesPerDecision = DEFAULT_K;
  let seed = DEFAULT_SEED;
  let outDir: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--games') {
      games = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
      continue;
    }

    if (arg === '--k') {
      samplesPerDecision = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
      continue;
    }

    if (arg === '--seed') {
      seed = argv[index + 1] ?? seed;
      index += 1;
      continue;
    }

    if (arg === '--out') {
      outDir = argv[index + 1] ?? null;
      index += 1;
    }
  }

  if (!Number.isFinite(games) || games <= 0) {
    throw new Error('bench-determinizer: --games must be a positive integer');
  }

  if (!Number.isFinite(samplesPerDecision) || samplesPerDecision <= 0) {
    throw new Error('bench-determinizer: --k must be a positive integer');
  }

  return { games, samplesPerDecision, seed, outDir };
}

function writePublish(result: BenchDeterminizerResult, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'config.json'),
    `${JSON.stringify(
      {
        games: result.config.games,
        samplesPerDecision: result.config.samplesPerDecision,
        seed: result.config.seed,
        playerCount: PLAYER_COUNT,
        task: 'L34-06',
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(outDir, 'aggregates.json'),
    `${JSON.stringify(
      {
        gamesCompleted: result.gamesCompleted,
        gamesStalled: result.gamesStalled,
        impossibleRate: result.impossibleRate,
        totals: result.totals,
        byTurnBucket: result.byTurnBucket,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(outDir, 'WRITEUP.md'), formatWriteup(result));
}

export function main(argv: readonly string[] = process.argv.slice(2)): BenchDeterminizerResult {
  const config = parseArgs(argv);
  const result = runBenchDeterminizer(config);

  if (result.impossibleRate > 0) {
    throw new Error(
      `bench-determinizer: impossible rate ${String(result.impossibleRate)} > 0 — belief defect, not a flake`,
    );
  }

  if (config.outDir !== null) {
    const repoRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../../',
    );
    const absoluteOut = isAbsolute(config.outDir)
      ? config.outDir
      : resolve(repoRoot, config.outDir);
    writePublish(result, absoluteOut);
    console.log(`Wrote calibration to ${absoluteOut}`);
  }

  console.log(
    JSON.stringify(
      {
        gamesCompleted: result.gamesCompleted,
        gamesStalled: result.gamesStalled,
        impossibleRate: result.impossibleRate,
        kitTop1: rate(result.totals.kitTop1Hits, result.totals.kitObservations),
        kitTop3: rate(result.totals.kitTop3Hits, result.totals.kitObservations),
        lifeMae: mean(result.totals.lifeAbsErrorSum, result.totals.lifeSamples),
      },
      null,
      2,
    ),
  );

  return result;
}

const isMain = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
