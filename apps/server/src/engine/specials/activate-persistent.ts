/**
 * Activate a persistent special on its user — rules spec §5.
 *
 * The played copy leaves `specialCards` in the play path; this records the live
 * effect until the counter (or other deactivation) sends it to the pool.
 */

import type { CardId, GameState, PersistentEffect } from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

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
    id: randomUUID(),
    cardId: input.cardId,
    isUpgraded: input.isUpgraded,
    counter: input.counter,
  };

  owner.activePersistentEffects.push(effect);
  return effect;
}
