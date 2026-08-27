/**
 * Diff real Incoming pending (targeting POV) for threat FX on queue (L39-05).
 * Presentation-only persistent chips (`persistent:…`) never trigger outline/cue.
 */

import { isAttackCardId, type PendingEffectView } from '@card-battle/shared';

/** Synthetic ids from `persistent-incoming.ts` — not engine queue entries. */
export function isPersistentPresentationId(effectId: string): boolean {
  return effectId.startsWith('persistent:');
}

/**
 * Effects newly targeting `you` since `seenIds`.
 * First call should seed `seenIds` without emitting (caller responsibility).
 */
export function newIncomingThreats(
  seenIds: ReadonlySet<string>,
  pendingEffects: readonly PendingEffectView[],
  you: string,
): PendingEffectView[] {
  const next: PendingEffectView[] = [];
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you) {
      continue;
    }
    if (isPersistentPresentationId(effect.id)) {
      continue;
    }
    if (seenIds.has(effect.id)) {
      continue;
    }
    next.push(effect);
  }
  return next;
}

/** Ids currently targeting `you` (real pending only). */
export function incomingTargetingYouIds(
  pendingEffects: readonly PendingEffectView[],
  you: string,
): Set<string> {
  const ids = new Set<string>();
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you) {
      continue;
    }
    if (isPersistentPresentationId(effect.id)) {
      continue;
    }
    ids.add(effect.id);
  }
  return ids;
}

/**
 * Attack Incoming only — first-game `incoming` hint (Shield / Mirror copy).
 * Spy, Thief, Tax, and persistents must not steal that card (designer 2026-08-27).
 */
export function incomingAttackTargetingYouIds(
  pendingEffects: readonly PendingEffectView[],
  you: string,
): Set<string> {
  const ids = new Set<string>();
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you) {
      continue;
    }
    if (isPersistentPresentationId(effect.id)) {
      continue;
    }
    if (!isAttackCardId(effect.cardId)) {
      continue;
    }
    ids.add(effect.id);
  }
  return ids;
}
