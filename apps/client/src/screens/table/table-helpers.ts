/**
 * Shared Table helpers — presentation helpers only; server revalidates intents.
 * Target-needed list mirrors frontend.md / V1 Table chrome (not new rules).
 */

import {
  ATTACK_CARD_IDS,
  getCard,
  type CardInstance,
  type PlayingStateView,
  type RewardChoice,
} from '@card-battle/shared';

export type RewardKind = RewardChoice['type'];

export const REWARD_KINDS: readonly RewardKind[] = [
  'lives',
  'points',
  'upgradePoint',
  'card',
] as const;

/** Player-facing labels for reward option dropdowns (not wire `type` ids). */
export const REWARD_KIND_LABELS: Record<RewardKind, string> = {
  lives: '4 lives',
  points: '8 points',
  upgradePoint: '1 upgrade point',
  card: 'A card',
};

export function nicknameOf(view: PlayingStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
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

/** Cards that Table sends with targetPlayerId (attacks, Spy, Thief, Absorber, Cloning, base Card Thief). */
export function cardPlayNeedsTarget(cardId: string, isUpgraded = false): boolean {
  if (cardId === 'card-thief') {
    return !isUpgraded;
  }

  return (
    (ATTACK_CARD_IDS as readonly string[]).includes(cardId) ||
    cardId === 'spy' ||
    cardId === 'thief' ||
    cardId === 'absorber' ||
    cardId === 'cloning'
  );
}

export function cardIsSelfOnlyPlay(cardId: string, isUpgraded = false): boolean {
  return !cardPlayNeedsTarget(cardId, isUpgraded);
}

/** Effect copy for Dialogs when Table `Card detail="face"` omits it. */
export function cardEffectText(instance: CardInstance): string {
  const definition = getCard(instance.cardId);
  if (definition === undefined) {
    return '';
  }
  return instance.isUpgraded ? definition.upgradeEffect : definition.effect;
}
