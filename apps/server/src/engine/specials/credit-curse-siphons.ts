/**
 * Curse siphon — rules spec §5 (designer 2026-08-24 / L50-02 + L50-09).
 *
 * Caller-side only: never enrich `applyDamage` / `applyLifeLoss` (golden rule 2).
 * Each Curse copy independently grants the original caster the lives the victim
 * actually lost (upgraded: ×2), including spend-tick loss (#V4-20). No credit
 * when the Curse sits on its original caster, or when that caster is missing
 * or eliminated. Ends at 1 life → pool.
 */

import type { GameState, Player } from '@card-battle/shared';

import { grantLives } from '../economy/grant-resources';
import { findPlayer } from '../turn/advance-turn';
import { deactivatePersistentEffect } from './deactivate-persistent';

const CURSE_SIPHON_BASE = 1;
const CURSE_SIPHON_UPGRADED = 2;

export function deactivateCursesAtLifeFloor(state: GameState, victim: Player): void {
  if (victim.lives > 1) {
    return;
  }

  const curseIds = victim.activePersistentEffects
    .filter((effect) => effect.cardId === 'curse')
    .map((effect) => effect.id);

  for (const effectId of curseIds) {
    deactivatePersistentEffect(state, victim.id, effectId);
  }
}

export function creditCurseSiphons(
  state: GameState,
  victim: Player,
  livesLost: number,
): void {
  if (livesLost > 0) {
    const curses = victim.activePersistentEffects.filter(
      (effect) => effect.cardId === 'curse',
    );

    for (const effect of curses) {
      const casterId = effect.originalCasterPlayerId;

      if (casterId == null || casterId === victim.id) {
        continue;
      }

      const caster = findPlayer(state, casterId);

      if (caster === undefined || caster.isEliminated) {
        continue;
      }

      const amount =
        livesLost * (effect.isUpgraded ? CURSE_SIPHON_UPGRADED : CURSE_SIPHON_BASE);
      grantLives(state, caster, amount, 'direct');
    }
  }

  deactivateCursesAtLifeFloor(state, victim);
}
