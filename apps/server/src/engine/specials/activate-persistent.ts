/**
 * Activate a persistent special on its user — rules spec §5.
 *
 * The played copy leaves `specialCards` in the play path; this records the live
 * effect until the counter (or other deactivation) sends it to the pool.
 * Effect ids are seed-derived (technical spec v3 §8.1 / §10.3).
 */

import type { CardId, GameState, PersistentEffect } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

export interface ActivatePersistentInput {
  state: GameState;
  ownerPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  counter: number | null;
}

export function activatePersistentEffect(input: ActivatePersistentInput): PersistentEffect {
  const owner = findPlayer(input.state, input.ownerPlayerId);

  if (owner === undefined) {
    throw new Error(`activatePersistentEffect: unknown player ${input.ownerPlayerId}`);
  }

  const effect: PersistentEffect = {
    id: `persist:${input.ownerPlayerId}:${String(owner.activePersistentEffects.length)}:${input.cardId}`,
    cardId: input.cardId,
    isUpgraded: input.isUpgraded,
    counter: input.counter,
  };

  owner.activePersistentEffects.push(effect);
  return effect;
}
