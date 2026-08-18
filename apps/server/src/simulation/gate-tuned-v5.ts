/**
 * L33-05 promotion gate: seat-rotated holdout, p < 0.01 vs heuristic-v4.
 *
 * Usage:
 *   pnpm --filter @card-battle/server exec tsx src/simulation/gate-tuned-v5.ts \
 *     --policy heuristic-tuned-v5 --games 2000 --seed l33-05-gate \
 *     --out ../../docs/simulation/2026-08-12-v5-tuned-gate/gate.json
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HEURISTIC_TUNED_V5_POLICY_ID } from '../bots/policies/heuristic-tuned-v5';
import { HEURISTIC_V4_POLICY_ID } from '../bots/policies/heuristic-v4';
import { getPolicy } from '../bots/registry';
import { computeHeuristicV4WeightsHash } from '../bots/weights-hash';
import { binomialTailPValueGe } from './binomial-test';
import { evaluatePolicyAgainstGauntlet } from './fitness-gauntlet';
import { buildFitSplit } from './fit-split';
import { wilsonInterval } from './wilson-interval';

function parseArgs(argv: readonly string[]): {
  readonly policy: string;
  readonly games: number;
  readonly seed: string;
  readonly out: string;
} {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') continue;
    if (token?.startsWith('--') !== true) continue;
    const key = token.slice(2);
    if (key === '') continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  const games = Number.parseInt(args.get('games') ?? '2000', 10);
  return {
    policy: args.get('policy') ?? HEURISTIC_TUNED_V5_POLICY_ID,
    games,
    seed: args.get('seed') ?? 'l33-05-gate',
    out:
      args.get('out') ??
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../../docs/simulation/2026-08-12-v5-tuned-gate/gate.json',
      ),
  };
}

function main(): void {
  const config = parseArgs(process.argv.slice(2));
  const matchupCount = Math.ceil(config.games / 2);
  const split = buildFitSplit({
    baseSeed: config.seed,
    trainCount: 1,
    holdoutCount: matchupCount,
  });
  void split.train;

  const candidate = getPolicy(config.policy);
  const v4Hash = computeHeuristicV4WeightsHash();
  const result = evaluatePolicyAgainstGauntlet(candidate, split.holdout, {
    difficulty: 'hard',
  });
  const decided = result.wins + result.losses;
  const pValue = binomialTailPValueGe(result.wins, decided, 0.5);
  const wilson = wilsonInterval(result.wins, decided);
  const passed =
    decided >= Math.floor(config.games * 0.75) &&
    result.winRate > 0.5 &&
    pValue < 0.01 &&
    Number.isFinite(pValue);

  const report = {
    policyId: candidate.id,
    candidateWeightsHash: candidate.weightsHash,
    incumbentPolicyId: HEURISTIC_V4_POLICY_ID,
    incumbentWeightsHash: v4Hash,
    seed: config.seed,
    requestedGames: config.games,
    matchups: matchupCount,
    wins: result.wins,
    losses: result.losses,
    stalls: result.stalls,
    gamesPlayed: result.games,
    decided,
    winRate: result.winRate,
    wilson,
    pValueOneSided: pValue,
    passed,
  };

  mkdirSync(path.dirname(path.resolve(config.out)), { recursive: true });
  writeFileSync(config.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));

  if (!passed) {
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
