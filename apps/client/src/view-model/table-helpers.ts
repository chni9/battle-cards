/**
 * Shared Table helpers — presentation helpers only; server revalidates intents.
 * Target-needed list mirrors frontend.md / V1 Table chrome (not new rules).
 */

import {
  ATTACK_CARD_IDS,
  formatCardEffectText,
  getCard,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
  type RewardChoice,
} from '@card-battle/shared';

import type { StructuredCost } from '../ui/structured-cost';

export type RewardKind = RewardChoice['type'];

export const REWARD_KINDS: readonly RewardKind[] = [
  'lives',
  'points',
  'upgradePoint',
  'card',
] as const;

/**
 * Spoken labels for reward options (aria / native fallback).
 * Interactive chrome prefers CostDisplay via REWARD_KIND_COSTS.
 */
export const REWARD_KIND_LABELS: Record<RewardKind, string> = {
  lives: '4 lives',
  points: '8 points',
  upgradePoint: '1 upgrade point',
  card: 'A card',
};

/** Icon costs for elimination reward picks (rules reward amounts). */
export const REWARD_KIND_COSTS: Partial<Record<RewardKind, StructuredCost>> = {
  lives: { kind: 'lives', amount: 4 },
  points: { kind: 'points', amount: 8 },
  upgradePoint: { kind: 'upgradePoint', amount: 1 },
};

export function nicknameOf(view: PlayingStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

/** Spy+ kit/hand reveal — base Spy is live resources only (Lot 69). */
export function hasFullSpyCardReveal(player: PublicPlayerView): boolean {
  const spied = player.spied;

  return (
    spied?.kitId !== undefined &&
    spied.hand !== undefined &&
    spied.specialCards !== undefined
  );
}

/** Kit the recipient already sees: death reveal, else Spy+. A base Spy keeps it hidden (Lot 69). Matches opponent-zone. */
export function visibleKitId(player: PublicPlayerView): KitId | null {
  if (player.eliminationReveal !== undefined) {
    return player.eliminationReveal.kitId;
  }
  if (hasFullSpyCardReveal(player)) {
    return player.spied?.kitId ?? null;
  }
  return null;
}

/** Living opponents with public `spyingOnYou` — Unspy picker (L58-07). */
export function livingSpiesOnYou(view: PlayingStateView): PublicPlayerView[] {
  return view.players.filter(
    (player) => !player.isYou && !player.isEliminated && player.spyingOnYou === true,
  );
}

export function buildRewardChoice(
  kind: RewardKind,
  cardInstanceId: string,
): RewardChoice | null {
  if (kind === 'card') {
    if (cardInstanceId === '') {
      return null;
    }

    return { type: 'card', instanceId: cardInstanceId };
  }

  return { type: kind };
}

/** Cards that Table sends with targetPlayerId (attacks, Spy, Thief, Absorber, Cloning, base Card Thief / Spy Thief). */
export function cardPlayNeedsTarget(cardId: string, isUpgraded = false): boolean {
  if (cardId === 'card-thief' || cardId === 'upgrade-point-thief' || cardId === 'spy-thief') {
    return !isUpgraded;
  }

  return (
    (ATTACK_CARD_IDS as readonly string[]).includes(cardId) ||
    cardId === 'spy' ||
    cardId === 'thief' ||
    cardId === 'absorber' ||
    cardId === 'cloning' ||
    cardId === 'curse'
  );
}

/** Card Transformer needs a hand card to consume (`consumeInstanceId`). */
function cardPlayNeedsConsume(cardId: string): boolean {
  return cardId === 'card-transformer';
}

export function cardIsSelfOnlyPlay(cardId: string, isUpgraded = false): boolean {
  return !cardPlayNeedsTarget(cardId, isUpgraded) && !cardPlayNeedsConsume(cardId);
}

/** Effect copy for Dialogs when Table `Card detail="face"` omits it. */
export function cardEffectText(instance: CardInstance): string {
  const definition = getCard(instance.cardId);
  if (definition === undefined) {
    return '';
  }
  return formatCardEffectText(definition, instance.isUpgraded);
}
