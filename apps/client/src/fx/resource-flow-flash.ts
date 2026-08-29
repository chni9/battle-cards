/**
 * One-shot resource flash for seats whose printed value does not change
 * (`?` unspied lives) and for two-way ticks that skip ResourceIcon tokens.
 * L51-16 — public `livesLost` is already on the log; this does not invent totals.
 */

import type { ResourceKind } from '../design/asset-lookup';

export type ResourceFlowFlashListener = (delta: number) => void;

const listeners = new Map<string, Set<ResourceFlowFlashListener>>();
const pending = new Map<string, number[]>();

function key(playerId: string, kind: ResourceKind): string {
  return `${playerId}:${kind}`;
}

export function emitResourceFlowFlash(
  playerId: string,
  kind: ResourceKind,
  delta: number,
): void {
  if (delta === 0) {
    return;
  }
  const id = key(playerId, kind);
  const subs = listeners.get(id);
  if (subs !== undefined && subs.size > 0) {
    for (const listener of subs) {
      listener(delta);
    }
    return;
  }
  const queued = pending.get(id);
  if (queued === undefined) {
    pending.set(id, [delta]);
    return;
  }
  queued.push(delta);
}

export function subscribeResourceFlowFlash(
  playerId: string,
  kind: ResourceKind,
  listener: ResourceFlowFlashListener,
): () => void {
  const id = key(playerId, kind);
  let subs = listeners.get(id);
  if (subs === undefined) {
    subs = new Set();
    listeners.set(id, subs);
  }
  subs.add(listener);
  const queued = pending.get(id);
  if (queued !== undefined) {
    pending.delete(id);
    for (const delta of queued) {
      listener(delta);
    }
  }
  return () => {
    const current = listeners.get(id);
    if (current === undefined) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(id);
    }
  };
}

/** Test helper — never call from product code. */
export function resetResourceFlowFlashForTests(): void {
  listeners.clear();
  pending.clear();
}
