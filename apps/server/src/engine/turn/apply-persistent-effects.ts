/**
 * Apply persistent effects that act on the current player after their action —
 * technical spec §4.3 step 4, rules spec §5–§6.
 */

import type { GameState, PersistentEffect, Player } from '@card-battle/shared';

import { applyLifeLoss } from '../life/apply-life-loss';
import { gainLives } from '../life/gain-lives';
import { findPlayer } from './advance-turn';

const IMPOSITION_POINTS_BASE = 2;
const IMPOSITION_POINTS_UPGRADED = 4;
const IMPOSITION_LIVES_BASE = 1;
const IMPOSITION_LIVES_UPGRADED = 2;
const POINTS_GENERATOR_BASE = 2;
const POINTS_GENERATOR_UPGRADED = 4;

export function applyPersistentEffects(state: GameState, playerId: string): void {
  const player = findPlayer(state, playerId);

  if (player === undefined || player.isEliminated) {
    return;
  }

  applyPointsGeneratorTicks(player);
  applyImpositionsOnVictim(state, player);
}

function applyPointsGeneratorTicks(owner: Player): void {
  for (const effect of owner.activePersistentEffects) {
    if (effect.cardId !== 'points-generator' || effect.counter === null || effect.counter <= 0) {
      continue;
    }

    owner.points += effect.isUpgraded ? POINTS_GENERATOR_UPGRADED : POINTS_GENERATOR_BASE;
  }
}

function applyImpositionsOnVictim(state: GameState, victim: Player): void {
  for (const imposer of state.players) {
    if (imposer.id === victim.id || imposer.isEliminated) {
      continue;
    }

    for (const effect of imposer.activePersistentEffects) {
      if (effect.cardId !== 'imposition' || effect.counter === null || effect.counter <= 0) {
        continue;
      }

      applyOneImposition(state, imposer, victim, effect);
    }
  }
}

function applyOneImposition(
  state: GameState,
  imposer: Player,
  victim: Player,
  effect: PersistentEffect,
): void {
  const pointsDue = effect.isUpgraded ? IMPOSITION_POINTS_UPGRADED : IMPOSITION_POINTS_BASE;
  const livesDue = effect.isUpgraded ? IMPOSITION_LIVES_UPGRADED : IMPOSITION_LIVES_BASE;

  if (victim.points >= pointsDue) {
    victim.points -= pointsDue;
    imposer.points += pointsDue;
    return;
  }

  const loss = applyLifeLoss(victim, livesDue, 'imposition');
  victim.turnLedger.livesLost += loss.livesLost;
  gainLives(imposer, loss.livesLost, state.lifeLimit);
}
