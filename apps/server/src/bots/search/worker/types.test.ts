/**
 * SearchRequest fairness boundary — technical spec v5 §8.1 (L32-08).
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '@card-battle/shared';

import type { SearchRequest } from './types';

describe('SearchRequest type boundary (L32-08)', () => {
  it('does not typecheck when handed a GameState', () => {
    const accept = (request: SearchRequest): number => {
      void request;
      return 1;
    };

    // @ts-expect-error SearchRequest must reject GameState (no-cheating boundary)
    const assigned: number = accept({} as GameState);

    expect(assigned).toBe(1);
  });
});
