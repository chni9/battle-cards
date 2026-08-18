/**
 * Fitted-eval gate wiring for engage search — L40-04.
 */

import { describe, expect, it } from 'vitest';

import { SEARCH_V5_ENGAGE_POLICY_ID } from '../bots/policies/search-v5-engage';
import { parseArenaArgs } from './arena-config';
import { parseFittedEvalGateArgs } from './gate-fitted-eval';
import {
  createFittedGatePolicies,
  ENGAGE_FITTED_LOGISTIC_PROFILE_ID,
  FITTED_LINEAR_PROFILE_ID,
  FITTED_LOGISTIC_PROFILE_ID,
  parseFittedSearchPrior,
} from './fitted-eval-gate-shared';

describe('fitted-eval gate engage prior (L40-04)', () => {
  it('parses --prior engage and --search-iterations', () => {
    expect(parseFittedSearchPrior(undefined)).toBe('v4');
    expect(parseFittedSearchPrior('engage')).toBe('engage');
    expect(() => parseFittedSearchPrior('paranoid')).toThrow(/prior/);

    const config = parseFittedEvalGateArgs([
      '--games',
      '40',
      '--seed',
      'l40-04-gate',
      '--out',
      '/tmp/gate.json',
      '--prior',
      'engage',
      '--fitted-profile',
      FITTED_LOGISTIC_PROFILE_ID,
      '--search-iterations',
      '8',
      '--max-turns',
      '200',
      '--workers',
      '1',
    ]);

    expect(config.prior).toBe('engage');
    expect(config.searchIterations).toBe(8);
    expect(config.maxTurns).toBe(200);
    expect(config.fittedProfileId).toBe(FITTED_LOGISTIC_PROFILE_ID);
    expect(config.games).toBe(40);
  });

  it('engage pair injects search-v5-engage ids and distinct hashes vs v4 pair', () => {
    const v4 = createFittedGatePolicies(
      FITTED_LINEAR_PROFILE_ID,
      FITTED_LOGISTIC_PROFILE_ID,
      'v4',
    );
    const engage = createFittedGatePolicies(
      FITTED_LINEAR_PROFILE_ID,
      ENGAGE_FITTED_LOGISTIC_PROFILE_ID,
      'engage',
    );

    expect(v4.linear.id).toBe('search-v5-linear');
    expect(engage.linear.id).toBe('search-v5-engage-linear');
    expect(engage.fitted.id).toBe('search-v5-engage-fitted');
    expect(engage.linear.weightsHash).not.toBe(engage.fitted.weightsHash);
    expect(SEARCH_V5_ENGAGE_POLICY_ID).toBe('search-v5-engage');
    expect(ENGAGE_FITTED_LOGISTIC_PROFILE_ID).toBe('search-engage-fitted-logistic');
  });

  it('arena parses --search-iterations for snapshot collection', () => {
    const config = parseArenaArgs([
      '--games',
      '2',
      '--policy-a',
      'search-v5-engage',
      '--policy-b',
      'search-v5-engage',
      '--seed',
      'l40-04-snap',
      '--out',
      '/tmp/arena.jsonl',
      '--kit-modes',
      'mirrored',
      '--search-iterations',
      '8',
      '--max-turns',
      '200',
      '--feature-snapshots',
      '/tmp/features.jsonl',
    ]);

    expect(config.searchIterations).toBe(8);
    expect(config.maxTurns).toBe(200);
    expect(config.featureSnapshotsPath).toBe('/tmp/features.jsonl');
    expect(config.policyA).toBe('search-v5-engage');
  });
});
