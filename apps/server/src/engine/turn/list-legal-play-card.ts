/**
 * Enumerate legal `playCard` actions — technical spec v3 §4.3 (L16-01).
 *
 * Calls real `handler.canPlay` and the shared play-cost gate; never re-derives rules.
 */

import type { CardInstance, GameState, Player } from '@card-battle/shared';

import { MAX_LIVES_PER_USE } from '../../cards/handlers/regeneration';
import { findHandler } from '../../cards/registry';
import { createRng } from '../rng';
import { findPlayer } from './advance-turn';
import type { TurnAction } from './perform-action';
import { canAffordPlayPoints } from './play-cost';

export function listLegalPlayCardActions(
  state: GameState,
  actor: Player,
): readonly TurnAction[] {
  const actions: TurnAction[] = [];
  const rng = createRng(`${state.seed}:list-legal-canplay`);
  const opponents = state.players.filter(
    (player) => player.id !== actor.id && !player.isEliminated,
  );
  const held: readonly CardInstance[] = [...actor.hand, ...actor.specialCards];

  for (const instance of held) {
    const handler = findHandler(instance.cardId);

    if (handler === undefined) {
      continue;
    }

    if (instance.cardId === 'regeneration') {
      for (let quantity = 1; quantity <= MAX_LIVES_PER_USE; quantity += 1) {
        const context = {
          state,
          sourcePlayerId: actor.id,
          targetPlayerId: null,
          card: instance,
          quantity,
          rng,
          nowMs: 0,
        };

        if (handler.canPlay(context)) {
          actions.push({
            type: 'playCard',
            instanceId: instance.instanceId,
            quantity,
          });
        }
      }

      continue;
    }

    // Self-only attempt (no target).
    {
      const context = {
        state,
        sourcePlayerId: actor.id,
        targetPlayerId: null,
        card: instance,
        quantity: null,
        rng,
        nowMs: 0,
      };

      if (handler.canPlay(context) && canAffordPlayPoints(actor, instance.cardId)) {
        actions.push({ type: 'playCard', instanceId: instance.instanceId });
      }
    }

    for (const opponent of opponents) {
      const context = {
        state,
        sourcePlayerId: actor.id,
        targetPlayerId: opponent.id,
        card: instance,
        quantity: null,
        rng,
        nowMs: 0,
      };

      if (handler.canPlay(context) && canAffordPlayPoints(actor, instance.cardId)) {
        actions.push({
          type: 'playCard',
          instanceId: instance.instanceId,
          targetPlayerId: opponent.id,
        });
      }
    }
  }

  return actions;
}

/** Resolve actor or undefined — shared by economy / orchestrator. */
export function requireLivingActor(
  state: GameState,
  playerId: string,
): Player | undefined {
  const actor = findPlayer(state, playerId);

  if (actor === undefined || actor.isEliminated) {
    return undefined;
  }

  return actor;
}
