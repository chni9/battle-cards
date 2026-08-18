/**
 * L40-05 gate CLI: search-v5-engage vs frozen heuristic-v4.
 */

import { describe, expect, it } from 'vitest';

import { SEARCH_V5_ENGAGE_POLICY_ID } from '../bots/policies/search-v5-engage';
import { SEARCH_V5_POLICY_ID } from '../bots/policies/search-v5';
import { parseSearchV5GateArgs } from './gate-search-v5';

describe('search-v5 gate CLI (L40-05)', () => {
  it('parses --policy search-v5-engage and --max-turns', () => {
    const config = parseSearchV5GateArgs([
      '--games',
      '40',
      '--seed',
      'l40-05-gate',
      '--out',
      '/tmp/gate.json',
      '--policy',
      SEARCH_V5_ENGAGE_POLICY_ID,
      '--max-turns',
      '400',
      '--workers',
      '1',
    ]);

    expect(config.policy).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(config.maxTurns).toBe(400);
    expect(config.games).toBe(40);
  });

  it('defaults policy to search-v5', () => {
    const config = parseSearchV5GateArgs([
      '--games',
      '2',
      '--seed',
      'x',
      '--out',
      '/tmp/gate.json',
      '--workers',
      '1',
    ]);

    expect(config.policy).toBe(SEARCH_V5_POLICY_ID);
    expect(config.maxTurns).toBeUndefined();
  });

  it('rejects an unknown policy id', () => {
    expect(() =>
      parseSearchV5GateArgs([
        '--games',
        '2',
        '--seed',
        'x',
        '--out',
        '/tmp/g.json',
        '--policy',
        'not-a-policy',
        '--workers',
        '1',
      ]),
    ).toThrow(/Unknown bot policy/);
  });
});
