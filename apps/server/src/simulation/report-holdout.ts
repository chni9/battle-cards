/**
 * Holdout report for a tuned profile — backlog L33-04.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveWeightsProfile } from '../bots/profiles/index';
import { computePolicyWeightsHash } from '../bots/weights-hash';
import { evaluateFitnessAgainstGauntlet } from './fitness-gauntlet';
import type { FitSplit } from './fit-split';
import { wilsonInterval } from './wilson-interval';

function main(): void {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const profileIdx = argv.indexOf('--profile');
  const outArg = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  const fitDir = path.resolve(
    outArg !== undefined && outArg !== ''
      ? outArg
      : path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          '../../../../docs/simulation/2026-08-12-v5-fit-v8',
        ),
  );
  const profileArg = profileIdx >= 0 ? argv[profileIdx + 1] : undefined;
  const profileId =
    profileArg !== undefined && profileArg !== '' ? profileArg : 'tuned-v5-candidate';
  const split = JSON.parse(
    readFileSync(path.join(fitDir, 'fit-split.json'), 'utf8'),
  ) as FitSplit;
  const weights = resolveWeightsProfile(profileId);
  const hash = computePolicyWeightsHash(weights);

  const train = evaluateFitnessAgainstGauntlet(weights, split.train);
  const holdout = evaluateFitnessAgainstGauntlet(weights, split.holdout);

  const trainCi = wilsonInterval(train.wins, train.wins + train.losses);
  const holdoutCi = wilsonInterval(holdout.wins, holdout.wins + holdout.losses);
  const gap = train.winRate - holdout.winRate;
  const gapWiderThanCi =
    gap > Math.max(trainCi.upper - trainCi.lower, holdoutCi.upper - holdoutCi.lower);

  const report = {
    weightsHash: hash,
    splitHash: split.contentHash,
    train: {
      wins: train.wins,
      losses: train.losses,
      stalls: train.stalls,
      winRate: train.winRate,
      wilson: trainCi,
    },
    holdout: {
      wins: holdout.wins,
      losses: holdout.losses,
      stalls: holdout.stalls,
      winRate: holdout.winRate,
      wilson: holdoutCi,
    },
    gap,
    overfitting: gapWiderThanCi,
  };

  writeFileSync(
    path.join(fitDir, 'holdout-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  const md = `# Holdout report — L33-04

Weights hash: \`${hash}\`
Split hash: \`${split.contentHash}\`

| Split | Win rate | Wilson CI | Wins / Losses / Stalls |
|---|---|---|---|
| Train | ${train.winRate.toFixed(4)} | [${trainCi.lower.toFixed(4)}, ${trainCi.upper.toFixed(4)}] | ${String(train.wins)} / ${String(train.losses)} / ${String(train.stalls)} |
| Holdout | ${holdout.winRate.toFixed(4)} | [${holdoutCi.lower.toFixed(4)}, ${holdoutCi.upper.toFixed(4)}] | ${String(holdout.wins)} / ${String(holdout.losses)} / ${String(holdout.stalls)} |

Gap (train − holdout): ${gap.toFixed(4)}
${gapWiderThanCi ? '**Overfitting:** gap wider than the confidence interval width — reported, not smoothed.' : 'Gap within CI width — no overfitting flag.'}
`;

  writeFileSync(path.join(fitDir, 'holdout-report.md'), md, 'utf8');
  console.log(md);
}

main();
