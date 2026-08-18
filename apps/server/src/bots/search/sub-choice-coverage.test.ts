/**
 * Sub-choice coverage assertion — technical spec v5 §10.5 (L35-06).
 */

import { describe, expect, it } from 'vitest';

import type { SubChoiceKind } from '@card-battle/shared';

import {
  assertSearchSubChoiceCoverage,
  SEARCH_SUB_CHOICE_HANDLERS,
  SEARCH_SUB_CHOICE_KINDS,
} from './sub-choice-coverage';
import { listSearchDecisions } from './list-search-decisions';
import { applySearchDecision } from './apply-search-decision';
import type { SearchDecision } from './search-types';

describe('sub-choice search coverage (L35-06)', () => {
  it('registers a handler for every SubChoiceKind', () => {
    assertSearchSubChoiceCoverage();

    const kinds = Object.keys(SEARCH_SUB_CHOICE_HANDLERS) as SubChoiceKind[];
    expect(kinds.sort()).toEqual([...SEARCH_SUB_CHOICE_KINDS].sort());
  });

  it('SearchDecision kinds cover every SubChoiceKind (exhaustiveness)', () => {
    const decisionKinds: Record<SubChoiceKind, SearchDecision['kind']> = {
      mirror: 'mirror',
      'steal-pick': 'steal-pick',
      'pool-pick': 'pool-pick',
      'special-pick': 'special-pick',
      'reanimation-kit': 'reanimation-kit',
      'elimination-reward': 'elimination-reward',
    };

    for (const kind of SEARCH_SUB_CHOICE_KINDS) {
      expect(decisionKinds[kind]).toBe(kind);
    }
  });

  it('listSearchDecisions and applySearchDecision are the wired coverage surface', () => {
    // Import-graph anchor: both modules must stay reachable for handlers.
    expect(typeof listSearchDecisions).toBe('function');
    expect(typeof applySearchDecision).toBe('function');
  });
});
