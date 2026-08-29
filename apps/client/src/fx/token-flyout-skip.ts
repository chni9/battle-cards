/**
 * One-shot skip so ResourceIcon does not double-fly a delta already choreographed
 * as a seat-to-seat transfer (L51-11 thief).
 */

import type { ResourceKind } from '../design/asset-lookup';

const pending = new Set<string>();

function key(playerId: string, kind: ResourceKind): string {
  return `${playerId}:${kind}`;
}

export function skipResourceIconFlyout(playerId: string, kind: ResourceKind): void {
  pending.add(key(playerId, kind));
}

export function shouldSkipResourceIconFlyout(
  playerId: string,
  kind: ResourceKind,
): boolean {
  const id = key(playerId, kind);
  if (!pending.has(id)) {
    return false;
  }
  pending.delete(id);
  return true;
}
