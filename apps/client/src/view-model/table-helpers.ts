/**
 * Shared Table helpers — presentation helpers only; server revalidates intents.
 * Target-needed list mirrors frontend.md / V1 Table chrome (not new rules).
 */

import {
  formatCardEffectText,
  getCard,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
  type RewardChoice,
} from '@card-battle/shared';


export type RewardKind = RewardChoice['type'];

export const REWARD_KINDS: readonly RewardKind[] = [
  'lives',
  'points',
  'upgradePoint',
  'card',
] as const;

/**
 * Spoken labels for reward options (aria / native fallback).
 */
export const REWARD_KIND_LABELS: Record<RewardKind, string> = {
  lives: '4 lives',
  points: '8 points',
  upgradePoint: '1 upgrade point',
  card: 'A card',
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

/** Effect copy for Dialogs when Table `Card detail="face"` omits it. */
export function cardEffectText(instance: CardInstance): string {
  const definition = getCard(instance.cardId);
  if (definition === undefined) {
    return '';
  }
  return formatCardEffectText(definition, instance.isUpgraded);
}
