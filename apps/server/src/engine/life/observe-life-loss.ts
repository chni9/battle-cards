/**
 * Caller-side observation of actual life loss — Ghost kit + Curse siphon.
 * Never called from inside `applyDamage` / `applyLifeLoss` (golden rule 2).
 */

import type { GameState, Player } from '@card-battle/shared';

import { creditGhostLifeLoss } from '../kits/credit-ghost-life-loss';
import { creditCurseSiphons } from '../specials/credit-curse-siphons';

export function observeLifeLoss(
  state: GameState,
  victim: Player,
  livesLost: number,
): void {
  creditGhostLifeLoss(state, victim, livesLost);
  creditCurseSiphons(state, victim, livesLost);
}
