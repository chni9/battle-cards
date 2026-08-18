/**
 * PUCT selection — technical spec v5 §6.3 / max^n §6.2 (L35-03 / L35-04).
 */

import { meanValue } from './max-n-values';
import type { SearchEdge, SearchNode } from './search-types';

/**
 * Score for expanding/selecting edge under max^n: owner maximizes own component.
 */
export function puctScore(
  edge: SearchEdge,
  parentVisits: number,
  ownerValueMean: number,
  explorationConstant: number,
): number {
  const q = edge.visits === 0 ? 0 : ownerValueMean;
  const u =
    explorationConstant * edge.prior * (Math.sqrt(parentVisits) / (1 + edge.visits));
  return q + u;
}

/**
 * Select the child edge that maximizes the owner's PUCT score (max^n).
 */
export function selectChild(
  node: SearchNode,
  ownerIndex: number,
  explorationConstant: number,
): SearchEdge {
  let best: SearchEdge | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const edge of node.children.values()) {
    const child = edge.child;
    const ownerMean =
      child === null || edge.visits === 0
        ? 0
        : meanValue(child.valueSums, child.visits, ownerIndex);
    const score = puctScore(edge, node.visits, ownerMean, explorationConstant);

    if (score > bestScore) {
      bestScore = score;
      best = edge;
    }
  }

  if (best === null) {
    throw new Error('selectChild: node has no children');
  }

  return best;
}
