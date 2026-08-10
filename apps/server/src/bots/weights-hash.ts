/**
 * Stable content hashes for registered policies — technical spec v5 §7.1 (L32-02).
 * Full `PolicyWeights` objects arrive in L33-01; until then hash today's constants.
 */

import { createHash } from 'node:crypto';

import * as lifeThresholds from './heuristic-life-thresholds';
import * as weights from './heuristic-weights';

/** Sentinel — `random-legal` has no tunable weights. */
export const RANDOM_LEGAL_WEIGHTS_HASH = 'random-legal:v0';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

/** Content hash of `heuristic-weights` + `heuristic-life-thresholds` exports. */
export function computeHeuristicV4WeightsHash(): string {
  const payload = stableStringify({
    weights: { ...weights },
    lifeThresholds: {
      REFERENCE_STARTING_LIVES: lifeThresholds.REFERENCE_STARTING_LIVES,
      // Functions are behaviour; freeze their reference-kit outputs instead of source text.
      regenAt10: lifeThresholds.regenSoftLifeForKit(10),
      regenAt18: lifeThresholds.regenSoftLifeForKit(18),
      regenAt4: lifeThresholds.regenSoftLifeForKit(4),
      taxAt10: lifeThresholds.taxLifeBufferForKit(10),
      taxAt18: lifeThresholds.taxLifeBufferForKit(18),
      taxAt4: lifeThresholds.taxLifeBufferForKit(4),
    },
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
