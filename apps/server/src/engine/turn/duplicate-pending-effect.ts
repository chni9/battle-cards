/**
 * Duplicate a pending effect onto another target — technical spec v4 §4.2.
 *
 * Super Mirror needs N copies at N targets. `redirectPendingAttack` moves; `queueEffect`
 * resets `damageMultiplier` and `queuedAt`. This primitive mints a fresh id and preserves both.
 */

import type {
  GameState,
  PendingEffect,
  PendingEffectRedirectSource,
} from '@card-battle/shared';

export function duplicatePendingEffect(
  state: GameState,
  effect: PendingEffect,
  newTargetId: string,
  redirectedBy: PendingEffectRedirectSource | null = null,
): PendingEffect {
  const target = state.players.find((player) => player.id === newTargetId);

  if (target === undefined) {
    throw new Error(`duplicatePendingEffect: unknown target ${newTargetId}`);
  }

  const duplicate: PendingEffect = {
    id: `fx:dup:${effect.id}:${newTargetId}`,
    sourcePlayerId: effect.sourcePlayerId,
    targetPlayerId: newTargetId,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
    queuedAt: effect.queuedAt,
    damageMultiplier: effect.damageMultiplier,
    redirectedBy,
    chosenInstanceId: effect.chosenInstanceId,
  };

  target.pendingEffects.push(duplicate);
  return duplicate;
}
