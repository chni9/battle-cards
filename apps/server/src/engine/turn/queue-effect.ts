/**
 * Queue a delayed effect on its target — technical spec §4.3, rules spec §6.
 *
 * Handlers call this; they never apply opponent-targeted effects inline.
 * Effect ids are seed-derived so scripted / simulated `GameState` can deep-equal
 * (technical spec v3 §8.1 / §10.3).
 */

import type { CardId, GameState, PendingEffect } from '@card-battle/shared';

export interface QueueEffectInput {
  state: GameState;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
}

export function queueEffect(input: QueueEffectInput): PendingEffect {
  const target = input.state.players.find((player) => player.id === input.targetPlayerId);

  if (target === undefined) {
    throw new Error(`queueEffect: unknown target ${input.targetPlayerId}`);
  }

  const effect: PendingEffect = {
    id: `fx:${input.state.turnSequence}:${input.targetPlayerId}:${String(target.pendingEffects.length)}`,
    sourcePlayerId: input.sourcePlayerId,
    targetPlayerId: input.targetPlayerId,
    cardId: input.cardId,
    isUpgraded: input.isUpgraded,
    queuedAt: input.state.turnSequence,
    damageMultiplier: 1,
  };

  target.pendingEffects.push(effect);
  return effect;
}
