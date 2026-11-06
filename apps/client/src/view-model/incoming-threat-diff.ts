/**
 * Diff real Incoming pending (targeting POV) for threat FX on queue (L39-05).
 * Presentation-only persistent chips (`persistent:…`) never trigger outline/cue.
 */

import { isAttackCardId, type CardId, type PendingEffectView } from '@card-battle/shared';

/** Legacy synthetic `persistent:` ids (V2 presentation chips, module deleted in L73-05) — never engine queue entries. */
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

/** Action Thief plus the four special thieves (rules spec §3 Thief, §5). Spy is not a Thief. */
export const INCOMING_THIEF_CARD_IDS = ['thief', 'card-thief', 'spy-thief', 'upgrade-point-thief', 'attack-thief'] as const satisfies readonly CardId[];
export type IncomingThiefCardId = (typeof INCOMING_THIEF_CARD_IDS)[number];

// A widened Set so the guard below needs no cast (same pattern as `CARD_IDS_THAT_ACT_ON_OPPONENTS` in shared card.ts).
const INCOMING_THIEF_CARD_ID_SET = new Set<string>(INCOMING_THIEF_CARD_IDS);

/** First-game `incoming-thief` hint: a type guard over the five thief ids. */
export function isIncomingThiefCardId(cardId: string): cardId is IncomingThiefCardId {
  return INCOMING_THIEF_CARD_ID_SET.has(cardId);
}

/**
 * The thief on `you` that resolves first: the non-persistent thief effect with the smallest `queuedAt`, ties in
 * wire order (golden rule 3, ascending `queuedAt`; L75-07, R12). Null when none.
 */
export function earliestIncomingThief(
  pendingEffects: readonly PendingEffectView[],
  you: string,
): IncomingThiefCardId | null {
  let best: { readonly cardId: IncomingThiefCardId; readonly queuedAt: number } | null = null;
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you || isPersistentPresentationId(effect.id)) {
      continue;
    }
    if (!isIncomingThiefCardId(effect.cardId)) {
      continue;
    }
    if (best === null || effect.queuedAt < best.queuedAt) {
      best = { cardId: effect.cardId, queuedAt: effect.queuedAt };
    }
  }
  return best === null ? null : best.cardId;
}

export function incomingThiefTargetingYouIds(
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
    if (!isIncomingThiefCardId(effect.cardId)) {
      continue;
    }
    ids.add(effect.id);
  }
  return ids;
}
