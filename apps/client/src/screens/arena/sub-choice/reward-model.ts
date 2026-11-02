/**
 * Elimination reward picks — rules spec §6; technical spec v7 §6.7, §13 Q55; V2 `reward-panel.tsx`
 * (L44-06); Appendix A `table-subchoice-reward` (L74-18).
 *
 * Two picks default to 4 lives and 8 points, a valid payload at once (V2). The Q55 guards are
 * client-side only, and the server still decides:
 * - a card the other choice holds is refused and greyed (`reward-card-already-chosen`);
 * - a card this prompt offered before and a refreshed prompt no longer offers is greyed
 *   (`reward-card-unavailable`), and Confirm stays blocked until both picks are valid.
 * Tuples are always rebuilt, never mutated.
 */

import type { ActionRejectCode, CardInstance, ResolveSubChoicePayload, RewardChoiceRequiredPayload } from '@card-battle/shared';

import { buildRewardChoice, type RewardKind } from '../../../view-model/table-helpers';

export type RewardCardBlock = Extract<ActionRejectCode, 'reward-card-already-chosen' | 'reward-card-unavailable'>;

export interface RewardPick {
  readonly kind: RewardKind;
  readonly cardId: string | null;
}

export type RewardPicks = readonly [RewardPick, RewardPick];
export type RewardSlot = 0 | 1;

export const DEFAULT_REWARD_PICKS: RewardPicks = [
  { kind: 'lives', cardId: null },
  { kind: 'points', cardId: null },
];

function otherSlot(slot: RewardSlot): RewardSlot {
  return slot === 0 ? 1 : 0;
}

function withPick(picks: RewardPicks, slot: RewardSlot, next: RewardPick): RewardPicks {
  return slot === 0 ? [next, picks[1]] : [picks[0], next];
}

/** Whether the pick in `slot` holds `cardId`. */
function holdsCard(picks: RewardPicks, slot: RewardSlot, cardId: string): boolean {
  const pick = picks[slot];
  return pick.kind === 'card' && pick.cardId === cardId;
}

/** Every card this prompt offered, first-seen order; `seen` itself when nothing is new. */
export function mergeSeenCards(seen: readonly CardInstance[], offered: readonly CardInstance[]): readonly CardInstance[] {
  const known = new Set(seen.map((card) => card.instanceId));
  const fresh: CardInstance[] = [];
  for (const card of offered) {
    if (known.has(card.instanceId)) continue;
    known.add(card.instanceId);
    fresh.push(card);
  }
  return fresh.length === 0 ? seen : [...seen, ...fresh];
}

/** null when `slot` may take the card; unavailable when not offered now; already-chosen when the other slot holds it. */
export function rewardCardBlock(
  cardId: string,
  slot: RewardSlot,
  picks: RewardPicks,
  offered: readonly CardInstance[],
): RewardCardBlock | null {
  if (!offered.some((card) => card.instanceId === cardId)) return 'reward-card-unavailable';
  if (holdsCard(picks, otherSlot(slot), cardId)) return 'reward-card-already-chosen';
  return null;
}

/** To 'card': the first offered card the other slot does not hold (else null). Any other kind clears the card. */
export function pickRewardKind(
  picks: RewardPicks,
  slot: RewardSlot,
  kind: RewardKind,
  offered: readonly CardInstance[],
): RewardPicks {
  if (kind !== 'card') return withPick(picks, slot, { kind, cardId: null });
  const free = offered.find((card) => !holdsCard(picks, otherSlot(slot), card.instanceId));
  return withPick(picks, slot, { kind, cardId: free?.instanceId ?? null });
}

/** Refuses (returns `picks`) a card the other slot holds. */
export function pickRewardCard(picks: RewardPicks, slot: RewardSlot, cardId: string): RewardPicks {
  if (holdsCard(picks, otherSlot(slot), cardId)) return picks;
  return withPick(picks, slot, { kind: 'card', cardId });
}

export type RewardConfirm =
  | { readonly payload: Extract<ResolveSubChoicePayload, { kind: 'elimination-reward' }>; readonly block: null }
  | { readonly payload: null; readonly block: RewardCardBlock };

/** Why the pick in `slot` cannot be sent, or null: an empty or no-longer-offered card, or the other slot's card. */
function pickBlock(subChoice: RewardChoiceRequiredPayload, picks: RewardPicks, slot: RewardSlot): RewardCardBlock | null {
  const pick = picks[slot];
  if (pick.kind !== 'card') return null;
  if (pick.cardId === null) return 'reward-card-unavailable';
  return rewardCardBlock(pick.cardId, slot, picks, subChoice.availableCards);
}

export function rewardConfirm(subChoice: RewardChoiceRequiredPayload, picks: RewardPicks): RewardConfirm {
  const block = pickBlock(subChoice, picks, 0) ?? pickBlock(subChoice, picks, 1);
  if (block !== null) return { payload: null, block };
  const first = buildRewardChoice(picks[0].kind, picks[0].cardId ?? '');
  const second = buildRewardChoice(picks[1].kind, picks[1].cardId ?? '');
  // Unreachable after the guards above (a card pick has an id); kept so no cast is needed.
  if (first === null || second === null) return { payload: null, block: 'reward-card-unavailable' };
  return {
    payload: { kind: 'elimination-reward', eliminationId: subChoice.eliminationId, choices: [first, second] },
    block: null,
  };
}
