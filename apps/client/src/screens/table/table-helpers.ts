/**
 * Shared Table helpers — presentation helpers only; server revalidates intents.
 * Target-needed list mirrors frontend.md / V1 Table chrome (not new rules).
 */

import {
  ATTACK_CARD_IDS,
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

/** Cards that V1 Table sent with targetPlayerId (attacks, Spy, Thief, Absorber, Cloning). */
export function cardPlayNeedsTarget(cardId: string): boolean {
  return (
    (ATTACK_CARD_IDS as readonly string[]).includes(cardId) ||
    cardId === 'spy' ||
    cardId === 'thief' ||
    cardId === 'absorber' ||
    cardId === 'cloning'
  );
}

export function cardIsSelfOnlyPlay(cardId: string): boolean {
  return !cardPlayNeedsTarget(cardId);
}
