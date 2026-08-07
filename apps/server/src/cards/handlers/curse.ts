/**
 * Curse — rules spec §5, victim-owned (designer 2026-08-07; supersedes L22-02 placement).
 * Activates on the chosen opponent; ticks in apply-persistent-effects; transfers on
 * successful attack (lives lost ≥ 1).
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

export const curseHandler: CardHandler = {
  canPlay(context): boolean {
    if (context.targetPlayerId === null) {
      return false;
    }

    const target = context.state.players.find((player) => player.id === context.targetPlayerId);

    return target !== undefined && !target.isEliminated && target.id !== context.sourcePlayerId;
  },

  play(context): void {
    if (context.targetPlayerId === null) {
      throw new Error('curse play requires a target');
    }

    // Effect lives on the cursed seat (designer 2026-08-07) — not the caster.
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.targetPlayerId,
      cardId: 'curse',
      isUpgraded: context.card.isUpgraded,
      counter: null,
      targetPlayerId: null,
    });
  },
};
