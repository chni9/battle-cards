/**
 * Exhaustive legal-action enumerator — technical spec v3 §4.3 (L16-01).
 *
 * Engine code, not bot code. Calls real validators; `{ type: 'draw' }` always present
 * for a living actor. Assassin multi-attack candidates land in L16-02.
 */

import type { GameState } from '@card-battle/shared';

import { listAssassinMultiAttackCandidates } from './assassin-candidates';
import { listLegalEconomyActions } from './list-legal-economy';
import { listLegalPlayCardActions, requireLivingActor } from './list-legal-play-card';
import type { TurnAction } from './perform-action';

export function listLegalActions(state: GameState, playerId: string): readonly TurnAction[] {
  const actor = requireLivingActor(state, playerId);

  if (actor === undefined) {
    return [];
  }

  return [
    { type: 'draw' },
    ...listLegalPlayCardActions(state, actor),
    ...listAssassinMultiAttackCandidates(state, actor),
    ...listLegalEconomyActions(actor),
  ];
}
