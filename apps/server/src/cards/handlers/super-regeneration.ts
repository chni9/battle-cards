/**
 * Super Regeneration — rules spec §5, backlog L21-02.
 * Strictly personal: +9 lives (+18 upgraded). Life cap applies via grantLives.
 */

import { grantLives } from '../../engine/economy/grant-resources';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

const BASE_LIVES = 9;
const UPGRADED_LIVES = 18;

export const superRegenerationHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null;
  },

  play(context: EffectContext): void {
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const amount = context.card.isUpgraded ? UPGRADED_LIVES : BASE_LIVES;
    grantLives(context.state, actor, amount, 'direct');
  },
};
