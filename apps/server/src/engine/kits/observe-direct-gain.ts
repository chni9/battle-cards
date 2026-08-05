/**
 * Duplicator gain observation — rules spec §4, #V4-23, L28-02.
 *
 * Copies direct lives / points / upgrade-point gains to every other alive player
 * with `kitId === 'duplicator'` and `duplicationActive`. Re-grants with
 * `origin: 'duplicated'` so two Duplicators cannot loop.
 */

import type { GameState } from '@card-battle/shared';

import {
  grantLives,
  grantPoints,
  grantUpgradePoints,
} from '../economy/grant-resources';

export type DirectGainKind = 'lives' | 'points' | 'upgradePoints';

export function observeDirectGain(
  state: GameState,
  beneficiaryId: string,
  kind: DirectGainKind,
  amount: number,
): void {
  if (amount <= 0) {
    return;
  }

  for (const player of state.players) {
    if (
      player.id === beneficiaryId ||
      player.isEliminated ||
      player.kitId !== 'duplicator' ||
      !player.duplicationActive
    ) {
      continue;
    }

    if (kind === 'points') {
      grantPoints(state, player, amount, 'duplicated');
    } else if (kind === 'upgradePoints') {
      grantUpgradePoints(state, player, amount, 'duplicated');
    } else {
      grantLives(state, player, amount, 'duplicated');
    }
  }
}
