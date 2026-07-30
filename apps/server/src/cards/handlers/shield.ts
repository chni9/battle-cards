/**
 * Shield — rules spec §3. Grants 4 shield points (7 upgraded). Only one active at a time.
 * Upgraded sets shieldIsUpgraded (Thief/Spy block wired at L3-04 / L3-05).
 */

import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

const SHIELD_POINTS_BASE = 4;
const SHIELD_POINTS_UPGRADED = 7;

export const shieldHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return false;
    }

    return actor.shield === 0;
  },

  play(context: EffectContext): void {
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    actor.shield = context.card.isUpgraded ? SHIELD_POINTS_UPGRADED : SHIELD_POINTS_BASE;
    actor.shieldIsUpgraded = context.card.isUpgraded;
  },
};
