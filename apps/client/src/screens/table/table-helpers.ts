/**
 * Shared Table helpers — presentation helpers only; server revalidates intents.
 * Target-needed list mirrors frontend.md / V1 Table chrome (not new rules).
 */

import {
  ACTIVE_SHIELD_INSTANCE_ID,
  ATTACK_CARD_IDS,
  formatCardEffectText,
  getCard,
  isUpgradeableActiveCardId,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
  type RewardChoice,
} from '@card-battle/shared';

import type { StructuredCost } from '../../design/components/structured-cost';

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

/** Kit art the recipient already sees — Spy or death reveal. Matches opponent-zone. */
/** Spy+ kit/hand reveal — base Spy is live resources only (Lot 69). */
export function hasFullSpyCardReveal(player: PublicPlayerView): boolean {
  const spied = player.spied;

  return (
    spied?.kitId !== undefined &&
    spied.hand !== undefined &&
    spied.specialCards !== undefined
  );
}

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

/**
 * Upgrade control on an already-active card or your ticking Sentence.
 * Hand copies keep the actions dialog. Returns the `upgradeCard` instance id.
 */
export function activeUpgradeInstanceId(
  view: PlayingStateView,
  instance: CardInstance,
): string | null {
  if (instance.isUpgraded || view.self.upgradePoints < 1) {
    return null;
  }

  if (instance.cardId === 'sentence') {
    const sentence = view.pendingSentences.find(
      (entry) => entry.id === instance.instanceId && entry.sourcePlayerId === view.you,
    );

    return sentence !== undefined && !sentence.isUpgraded ? sentence.id : null;
  }

  if (instance.instanceId === ACTIVE_SHIELD_INSTANCE_ID) {
    return view.self.shield > 0 ? ACTIVE_SHIELD_INSTANCE_ID : null;
  }

  if (!isUpgradeableActiveCardId(instance.cardId)) {
    return null;
  }

  const effect = view.self.activePersistentEffects.find(
    (entry) => entry.id === instance.instanceId,
  );

  return effect !== undefined && !effect.isUpgraded ? effect.id : null;
}

/** Card Transformer needs a hand card to consume (`consumeInstanceId`). */
export function cardPlayNeedsConsume(cardId: string): boolean {
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
