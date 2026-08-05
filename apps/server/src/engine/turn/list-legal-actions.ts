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
import { listLegalDeactivateActions } from '../specials/list-legal-deactivate';
import { listLegalActivateDuplicationActions } from '../kits/activate-duplication';
import type { TurnAction } from './perform-action';
import { hasActiveSubChoice } from './sub-choice';

export function listLegalActions(state: GameState, playerId: string): readonly TurnAction[] {
  const actor = requireLivingActor(state, playerId);

  if (actor === undefined) {
    return [];
  }

  // Single sub-choice gate (technical spec v4 §4.4/§10.2): while Mirror or an
  // elimination reward is active, no ordinary TurnAction is legal for anyone — the
  // only legal moves are that sub-choice's own resolution, which is not part of
  // this enumeration (`resolveSubChoice` is a distinct message, not a `TurnAction`).
  if (hasActiveSubChoice(state)) {
    return [];
  }

  return [
    { type: 'draw' },
    ...listLegalPlayCardActions(state, actor),
    ...listAssassinMultiAttackCandidates(state, actor),
    ...listLegalEconomyActions(actor),
    ...listLegalDeactivateActions(actor),
    ...listLegalActivateDuplicationActions(actor),
  ];
}
