/**
 * Train / holdout seed+matchup split — backlog L33-04 discipline (L33-03 writes before gen 0).
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { createRng } from '../engine/rng';

export interface FitMatchup {
  readonly seed: string;
  /** Kit mode for arena cells. */
  readonly kitMode: 'mirrored' | 'random';
}

export interface FitSplit {
  readonly version: 1;
  readonly baseSeed: string;
  readonly train: readonly FitMatchup[];
  readonly holdout: readonly FitMatchup[];
  readonly contentHash: string;
}

export function buildFitSplit(input: {
  readonly baseSeed: string;
  readonly trainCount: number;
  readonly holdoutCount: number;
}): FitSplit {
  const rng = createRng(`${input.baseSeed}:fit-split`);
  const train: FitMatchup[] = [];
  const holdout: FitMatchup[] = [];

  for (let index = 0; index < input.trainCount; index += 1) {
    train.push({
      seed: `${input.baseSeed}:train:${String(index)}`,
      kitMode: rng.nextInt(2) === 0 ? 'mirrored' : 'random',
    });
  }

  for (let index = 0; index < input.holdoutCount; index += 1) {
    holdout.push({
      seed: `${input.baseSeed}:holdout:${String(index)}`,
      kitMode: rng.nextInt(2) === 0 ? 'mirrored' : 'random',
    });
  }

  const payload = JSON.stringify({ train, holdout, baseSeed: input.baseSeed });
  const contentHash = createHash('sha256').update(payload).digest('hex').slice(0, 16);

  return {
    version: 1,
    baseSeed: input.baseSeed,
    train,
    holdout,
    contentHash,
  };
}

export function writeFitSplit(path: string, split: FitSplit): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(split, null, 2)}\n`, 'utf8');
}
