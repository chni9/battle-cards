/**
 * max^n value vectors — L35-03 / #V5-8.
 */

import { describe, expect, it } from 'vitest';

import {
  backupValueVector,
  livingSeatIds,
  livingOwnerIndex,
  meanValue,
  ownerIndex,
} from './max-n-values';
import { puctScore, selectChild } from './puct';
import type { SearchEdge, SearchNode } from './search-types';

function edge(
  key: string,
  prior: number,
  visits: number,
  child: SearchNode | null,
): SearchEdge {
  return {
    decisionKey: key,
    decision: { kind: 'action', action: { type: 'draw' } },
    prior,
    visits,
    child,
  };
}

function node(
  ownerPlayerId: string,
  visits: number,
  valueSums: Float64Array,
  children: Map<string, SearchEdge>,
): SearchNode {
  return {
    infoSetKey: `n:${ownerPlayerId}`,
    ownerPlayerId,
    decisionKind: 'action',
    visits,
    valueSums,
    children,
  };
}

describe('max^n values (L35-03)', () => {
  it('indexes living seats and backs up vectors', () => {
    const living = livingSeatIds([
      { id: 'a', isEliminated: false },
      { id: 'b', isEliminated: true },
      { id: 'c', isEliminated: false },
    ]);
    expect(living).toEqual(['a', 'c']);
    expect(ownerIndex(living, 'c')).toBe(1);
    expect(livingOwnerIndex(living, 'b')).toBeNull();

    const sums = new Float64Array(2);
    backupValueVector(sums, Float64Array.from([0.2, 0.8]));
    backupValueVector(sums, Float64Array.from([0.4, 0.6]));
    expect(meanValue(sums, 2, 0)).toBeCloseTo(0.3);
    expect(meanValue(sums, 2, 1)).toBeCloseTo(0.7);
  });

  it('selectChild maximizes the owner component, not an opponent (rejects paranoid)', () => {
    // Owner a: edge "harass-c" is better for a; edge "finish-b" looks good for
    // paranoid (hurts the weak seat) but worse for a's own win-prob.
    const harassChild = node('c', 10, Float64Array.from([0.55 * 10, 0.2 * 10, 0.25 * 10]), new Map());
    const finishChild = node('c', 10, Float64Array.from([0.35 * 10, 0.05 * 10, 0.6 * 10]), new Map());

    const children = new Map<string, SearchEdge>([
      ['finish-b', edge('finish-b', 0.5, 10, finishChild)],
      ['harass-c', edge('harass-c', 0.5, 10, harassChild)],
    ]);
    const root = node('a', 20, Float64Array.from([0, 0, 0]), children);

    const chosen = selectChild(root, 0, 0);
    expect(chosen.decisionKey).toBe('harass-c');
  });

  it('puctScore blends mean value with prior exploration', () => {
    const unexplored = edge('x', 1, 0, null);
    expect(puctScore(unexplored, 100, 0, 1.25)).toBeGreaterThan(0);
  });
});
