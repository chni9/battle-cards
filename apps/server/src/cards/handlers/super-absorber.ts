/**
 * Super Absorber — rules spec §5, backlog L22-03, #V4-21, designer 2026-08-07.
 * Activates persistent counter 2; on play, snapshots all in-window opponents'
 * last-turn ledgers; then absorbs on each living victim's turn while armed.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import { absorbLedgerFromVictim } from '../../engine/turn/absorb-ledger';
import { isAbsorberTargetable } from '../../engine/turn/absorb-window';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler } from '../handler';

const SUPER_ABSORBER_COUNTER = 2;

export const superAbsorberHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'super-absorber',
      isUpgraded: context.card.isUpgraded,
      counter: SUPER_ABSORBER_COUNTER,
      targetPlayerId: null,
    });

    const owner = findPlayer(context.state, context.sourcePlayerId);

    if (owner === undefined) {
      return;
    }

    const multiplier = context.card.isUpgraded ? 2 : 1;

    for (const opponent of context.state.players) {
      if (opponent.id === owner.id || !isAbsorberTargetable(opponent)) {
        continue;
      }

      absorbLedgerFromVictim(context.state, owner, opponent, multiplier);
    }
  },
};
