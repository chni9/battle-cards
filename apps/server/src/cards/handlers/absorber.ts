/**
 * Absorber — rules spec §3. Immediate: gain lives the target lost last complete turn.
 * Upgraded also captures every point and upgrade point that left (Lot 68).
 */

import { findPlayer } from '../../engine/turn/advance-turn';
import { absorbLedgerFromVictim } from '../../engine/turn/absorb-ledger';
import type { CardHandler, EffectContext } from '../handler';

export const absorberHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId !== null;
  },

  play(context: EffectContext): void {
    const targetPlayerId = context.targetPlayerId;
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (targetPlayerId === null || actor === undefined) {
      return;
    }

    const target = findPlayer(context.state, targetPlayerId);

    if (target === undefined) {
      return;
    }

    absorbLedgerFromVictim(context.state, actor, target, {
      includeSpend: context.card.isUpgraded,
    });
  },
};
