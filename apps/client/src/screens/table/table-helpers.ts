/**
 * Shared Table helpers — no rule logic.
 */

import type { PlayingStateView, RewardChoice } from '@card-battle/shared';

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
