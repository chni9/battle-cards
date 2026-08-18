/**
 * Checked-in weights profiles — technical spec v5 §5.2 (L33-01).
 * Resolve by profile id only; never by env or network on the room path.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_POLICY_WEIGHTS,
  parsePolicyWeights,
  type PolicyWeights,
} from '../policy-weights';

const PROFILES_DIR = dirname(fileURLToPath(import.meta.url));

/** Built-in id for today's module-constant default. */
export const DEFAULT_WEIGHTS_PROFILE_ID = 'default';

/**
 * Profile id → file under this directory.
 * Add new checked-in profiles here when promoting candidates.
 */
const PROFILE_FILES: Readonly<Record<string, string>> = {
  [DEFAULT_WEIGHTS_PROFILE_ID]: 'default.json',
  'tuned-v5-candidate': 'tuned-v5-candidate.json',
  'tuned-v5-one-ply': 'tuned-v5-one-ply.json',
  'search-fitted-logistic': 'search-fitted-logistic.json',
  'search-engage-fitted-logistic': 'search-engage-fitted-logistic.json',
};

export function listWeightsProfileIds(): readonly string[] {
  return Object.keys(PROFILE_FILES).sort();
}

export function resolveWeightsProfile(profileId: string | null | undefined): PolicyWeights {
  if (profileId === null || profileId === undefined || profileId === DEFAULT_WEIGHTS_PROFILE_ID) {
    return DEFAULT_POLICY_WEIGHTS;
  }

  const fileName = PROFILE_FILES[profileId];

  if (fileName === undefined) {
    throw new Error(`Unknown weights profile id: ${profileId}`);
  }

  const raw = JSON.parse(readFileSync(join(PROFILES_DIR, fileName), 'utf8')) as unknown;
  return parsePolicyWeights(raw);
}

export function weightsProfilePath(profileId: string): string {
  const fileName = PROFILE_FILES[profileId];

  if (fileName === undefined) {
    throw new Error(`Unknown weights profile id: ${profileId}`);
  }

  return join(PROFILES_DIR, fileName);
}
