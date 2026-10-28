/**
 * Threat arrows, labels, fan-out bursts and Mirror state — technical spec v7 §6.5; Lot 73
 * (L73-04).
 *
 * One `ThreatEntry` per `pendingEffects` item, each with its own label: the listed damage
 * (`listedAttackDamage` × `damageMultiplier`) or the effect's card icon. Never a summed total —
 * golden rule 1 (designer 2026-09-29): which attacks cancel, bundle or go through is decided on
 * the target's turn, so adding labels would promise a number the engine may not deliver. A
 * queued effect resolves on its target's turn (rules spec §6), which is why every entry stays
 * visible until the server removes it from the wire.
 *
 * Reads `pendingEffects` and `players` only: earlier Mirror hops live in the action log, not
 * here (§6.5). Every value comes from a field the server sent this recipient.
 */

import {
  listedAttackDamage,
  type CardId,
  type PendingEffectRedirectSource,
  type PendingEffectView,
  type PlayingStateView,
  type SubChoiceRequiredPayload,
} from '@card-battle/shared';

import { hasInvisibility } from './attack-targets';
import { recurringChips, type RecurringChip } from './recurring-chips';
import { seatColorIndexOf } from './seats';
import { threatToneFor } from './threat-tone';

/** POV is the target, the source, or neither (§6.5). A self-queued base Suicide is `incoming`. */
export type ThreatRelation = 'incoming' | 'outgoing' | 'third-party';

/** The damage a pending attack deals, or the icon of an effect that deals none. */
export type ThreatLabel =
  | { kind: 'damage'; amount: number }
  | { kind: 'effect'; cardId: CardId };

/**
 * `threat-tone.ts` classes incoming threats; the POV's own outgoing arrows get `mine`. Derived
 * from the function so this module adds no `fx/` import (frontend.md: only `threat-tone.ts` and
 * `opponent-token-chips.ts` reach into `fx/`).
 */
export type ThreatEntryTone = ReturnType<typeof threatToneFor> | 'mine';

export interface ThreatEntry {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  /** For the "queued #N" tooltip and for ordering. */
  queuedAt: number;
  relation: ThreatRelation;
  tone: ThreatEntryTone;
  /** `seatColorIndexOf(view, sourcePlayerId)`, so an arrow and its seat share one colour. */
  sourceSeatColorIndex: number;
  /** One label per effect, never a total. */
  label: ThreatLabel;
  /** `source|target|queuedAt|card`: arrows with the same key sit side by side. */
  groupKey: string;
  /** The key of the `FanOutGroup` holding this effect, else null. */
  fanOutKey: string | null;
  /** From `redirectedBy`: the redirector is the source, the badge says why. */
  mirrorBadge: PendingEffectRedirectSource | null;
  /** True only while a `mirror` sub-choice lists this effect id. */
  mirrorEligible: boolean;
}

export interface FanOutGroup {
  /** `source|queuedAt|card`. */
  key: string;
  sourcePlayerId: string;
  cardId: CardId;
  queuedAt: number;
  /** One row per effect in wire order: a seat hit twice gets two badges, never a per-seat sum. */
  targets: readonly { playerId: string; effectId: string; label: ThreatLabel }[];
}

export interface ThreatsModel {
  /** Wire order. Fan-out members stay here with `fanOutKey` set; the renderer draws them as a burst. */
  entries: readonly ThreatEntry[];
  /** First-seen wire order. */
  fanOuts: readonly FanOutGroup[];
  /** Curse on the POV and opponent Poison / Imposition chips with their paused state (§6.5, L73-05). */
  recurring: readonly RecurringChip[];
}

/**
 * Plays that hit every opponent by nature (spec v7 §6.5; server `mega-attack.ts`, `suicide.ts`,
 * `attack-thief.ts` queue one copy per alive opponent at every tier; `card-thief.ts`,
 * `spy-thief.ts` and `upgrade-point-thief.ts` do so when upgraded; `super-mirror.ts` copies carry
 * `redirectedBy: 'super-mirror'`). Designer 2026-10-27 (Q1): their burst stays while two or more
 * copies remain, even after earlier copies resolved.
 */
export const HITS_ALL_CARD_IDS = [
  'mega-attack',
  'suicide',
  'attack-thief',
] as const satisfies readonly CardId[];
export const HITS_ALL_WHEN_UPGRADED_CARD_IDS = [
  'card-thief',
  'spy-thief',
  'upgrade-point-thief',
] as const satisfies readonly CardId[];

/**
 * Lookup sets, as `card.ts` builds `CARD_IDS_THAT_ACT_ON_OPPONENTS_SET`: a `Set<string>` reads
 * any `CardId` without widening the `as const` tuples.
 */
const HITS_ALL_SET = new Set<string>(HITS_ALL_CARD_IDS);
const HITS_ALL_WHEN_UPGRADED_SET = new Set<string>(HITS_ALL_WHEN_UPGRADED_CARD_IDS);

function isHitsAllCopy(effect: PendingEffectView): boolean {
  if (effect.redirectedBy === 'super-mirror') {
    return true;
  }
  if (HITS_ALL_SET.has(effect.cardId)) {
    return true;
  }
  return effect.isUpgraded && HITS_ALL_WHEN_UPGRADED_SET.has(effect.cardId);
}

function labelFor(effect: PendingEffectView): ThreatLabel {
  const amount = listedAttackDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
  return amount === null
    ? { kind: 'effect', cardId: effect.cardId }
    : { kind: 'damage', amount };
}

function fanOutGroups(view: PlayingStateView): FanOutGroup[] {
  // A Map keeps first-seen (wire) order.
  const buckets = new Map<string, PendingEffectView[]>();
  for (const effect of view.pendingEffects) {
    // Base Suicide queues on its own user; that self-queue never joins the burst.
    if (effect.targetPlayerId === effect.sourcePlayerId) {
      continue;
    }
    const key = `${effect.sourcePlayerId}|${effect.queuedAt}|${effect.cardId}`;
    const bucket = buckets.get(key);
    if (bucket === undefined) {
      buckets.set(key, [effect]);
    } else {
      bucket.push(effect);
    }
  }

  const groups: FanOutGroup[] = [];
  for (const [key, effects] of buckets) {
    const first = effects[0];
    if (first === undefined) {
      continue;
    }
    const targets = new Set(effects.map((effect) => effect.targetPlayerId));
    // One target has nothing to compress: a plain arrow (designer 2026-10-27, Q2).
    if (targets.size < 2) {
      continue;
    }
    // A hits-all play keeps its burst (Q1); its copies exit through `isHitsAllCopy` and never
    // reach the coverage test. Any other set needs the literal "across every opponent" (§6.5):
    // every living opponent of the source except living Invisible seats, because a volley cannot
    // target one (server `isIllegalOpposingTarget`, L65-02). That covers the Review's Assassin
    // volley.
    const covered =
      effects.every(isHitsAllCopy) ||
      view.players
        .filter(
          (player) =>
            player.id !== first.sourcePlayerId && !player.isEliminated && !hasInvisibility(player),
        )
        .every((player) => targets.has(player.id));
    if (!covered) {
      continue;
    }
    groups.push({
      key,
      sourcePlayerId: first.sourcePlayerId,
      cardId: first.cardId,
      queuedAt: first.queuedAt,
      targets: effects.map((effect) => ({
        playerId: effect.targetPlayerId,
        effectId: effect.id,
        label: labelFor(effect),
      })),
    });
  }
  return groups;
}

function relationOf(view: PlayingStateView, effect: PendingEffectView): ThreatRelation {
  if (effect.targetPlayerId === view.you) {
    return 'incoming';
  }
  return effect.sourcePlayerId === view.you ? 'outgoing' : 'third-party';
}

export function threats(
  view: PlayingStateView,
  subChoice: SubChoiceRequiredPayload | null,
): ThreatsModel {
  const fanOuts = fanOutGroups(view);
  const fanOutKeyByEffectId = new Map<string, string>();
  for (const group of fanOuts) {
    for (const target of group.targets) {
      fanOutKeyByEffectId.set(target.effectId, group.key);
    }
  }

  const entries = view.pendingEffects.map((effect): ThreatEntry => {
    const relation = relationOf(view, effect);
    return {
      effectId: effect.id,
      sourcePlayerId: effect.sourcePlayerId,
      targetPlayerId: effect.targetPlayerId,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
      queuedAt: effect.queuedAt,
      relation,
      tone: relation === 'outgoing' ? 'mine' : threatToneFor(effect.cardId),
      sourceSeatColorIndex: seatColorIndexOf(view, effect.sourcePlayerId),
      label: labelFor(effect),
      groupKey: `${effect.sourcePlayerId}|${effect.targetPlayerId}|${effect.queuedAt}|${effect.cardId}`,
      fanOutKey: fanOutKeyByEffectId.get(effect.id) ?? null,
      mirrorBadge: effect.redirectedBy,
      mirrorEligible:
        subChoice?.kind === 'mirror' && subChoice.eligibleEffectIds.includes(effect.id),
    };
  });

  return { entries, fanOuts, recurring: recurringChips(view) };
}

/**
 * Grid mode (§6.5): the POV's own arrows stay, and a tapped seat adds its own. A pure relation
 * filter; whether a fan-out member draws as a burst is the renderer's choice.
 */
export function gridThreatEntries(
  model: ThreatsModel,
  povId: string,
  tappedSeatId: string | null,
): readonly ThreatEntry[] {
  return model.entries.filter((entry) => {
    const involves = (playerId: string): boolean =>
      entry.sourcePlayerId === playerId || entry.targetPlayerId === playerId;
    return involves(povId) || (tappedSeatId !== null && involves(tappedSeatId));
  });
}

/** A seat's incoming and outgoing effect ids, in wire order, for the tap highlight (§6.5). */
export function seatThreatIds(
  model: ThreatsModel,
  playerId: string,
): { incoming: readonly string[]; outgoing: readonly string[] } {
  return {
    incoming: model.entries
      .filter((entry) => entry.targetPlayerId === playerId)
      .map((entry) => entry.effectId),
    outgoing: model.entries
      .filter((entry) => entry.sourcePlayerId === playerId)
      .map((entry) => entry.effectId),
  };
}
