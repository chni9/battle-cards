/**
 * Apply persistent effects that act on the current player after their action —
 * technical spec §4.3 step 4, rules spec §5–§6, Lot 22.
 *
 * Tick order (implementation detail, decisions.md 2026-08-05): Points Generator →
 * Super Absorber → Imposition → Poison. Super Absorber runs before life-ticking
 * persistents so it does not re-absorb lives lost later in the same phase.
 * Curse no longer ticks on spend (L50-02); it siphons via `observeLifeLoss` and
 * deactivates here if the victim is already at 1 life.
 */

import type { GameState, PersistentEffect, Player } from '@card-battle/shared';

import {
  grantLives,
  grantPoints,
} from '../economy/grant-resources';
import { applyLifeLoss } from '../life/apply-life-loss';
import { observeLifeLoss } from '../life/observe-life-loss';
import { deactivateCursesAtLifeFloor } from '../specials/credit-curse-siphons';
import { playerIsInvisible } from '../specials/is-invisible';
import { absorbLedgerFromVictim } from './absorb-ledger';
import { findPlayer } from './advance-turn';
import { recordEliminationContributor } from './elimination-rewards';

const IMPOSITION_POINTS_BASE = 2;
const IMPOSITION_POINTS_UPGRADED = 4;
const IMPOSITION_LIVES_BASE = 1;
const IMPOSITION_LIVES_UPGRADED = 2;
const POINTS_GENERATOR_BASE = 2;
const POINTS_GENERATOR_UPGRADED = 4;
const INVISIBILITY_POINTS_BASE = 4;
const INVISIBILITY_POINTS_UPGRADED = 6;
const POISON_LIVES_BASE = 1;
const POISON_LIVES_UPGRADED = 2;

export function applyPersistentEffects(state: GameState, playerId: string): void {
  const player = findPlayer(state, playerId);

  if (player === undefined || player.isEliminated) {
    return;
  }

  applyPointsGeneratorTicks(state, player);
  applyInvisibilityTicks(state, player);

  // #V4-9a: already-active persistents stay armed; ticks skip while invisible.
  if (playerIsInvisible(player)) {
    return;
  }

  applySuperAbsorbersOnVictim(state, player);
  applyImpositionsOnVictim(state, player);
  applyPoisonsOnVictim(state, player);
  deactivateCursesAtLifeFloor(state, player);
}

function applyPointsGeneratorTicks(state: GameState, owner: Player): void {
  for (const effect of owner.activePersistentEffects) {
    if (effect.cardId !== 'points-generator' || effect.counter === null || effect.counter <= 0) {
      continue;
    }

    grantPoints(
      state,
      owner,
      effect.isUpgraded ? POINTS_GENERATOR_UPGRADED : POINTS_GENERATOR_BASE,
      'direct',
    );
  }
}

function applyInvisibilityTicks(state: GameState, owner: Player): void {
  for (const effect of owner.activePersistentEffects) {
    if (effect.cardId !== 'invisibility') {
      continue;
    }

    grantPoints(
      state,
      owner,
      effect.isUpgraded ? INVISIBILITY_POINTS_UPGRADED : INVISIBILITY_POINTS_BASE,
      'direct',
    );
  }
}

function applySuperAbsorbersOnVictim(state: GameState, victim: Player): void {
  for (const owner of state.players) {
    if (owner.id === victim.id || owner.isEliminated) {
      continue;
    }

    for (const effect of owner.activePersistentEffects) {
      if (effect.cardId !== 'super-absorber' || effect.counter === null || effect.counter <= 0) {
        continue;
      }

      const multiplier = effect.isUpgraded ? 2 : 1;
      absorbLedgerFromVictim(state, owner, victim, multiplier);
    }
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
    grantPoints(state, imposer, pointsDue, 'direct');
    return;
  }

  const loss = applyLifeLoss(victim, livesDue, 'imposition');
  victim.turnLedger.livesLost += loss.livesLost;
  observeLifeLoss(state, victim, loss.livesLost);
  grantLives(state, imposer, loss.livesLost, 'direct');
  recordEliminationContributor(state, victim.id, imposer.id, loss.livesLost);
}

function applyPoisonsOnVictim(state: GameState, victim: Player): void {
  for (const poisoner of state.players) {
    if (poisoner.id === victim.id || poisoner.isEliminated) {
      continue;
    }

    for (const effect of poisoner.activePersistentEffects) {
      if (effect.cardId !== 'poison' || effect.counter === null || effect.counter <= 0) {
        continue;
      }

      const livesDue = effect.isUpgraded ? POISON_LIVES_UPGRADED : POISON_LIVES_BASE;
      const loss = applyLifeLoss(victim, livesDue, 'poison');
      victim.turnLedger.livesLost += loss.livesLost;
      observeLifeLoss(state, victim, loss.livesLost);
      recordEliminationContributor(state, victim.id, poisoner.id, loss.livesLost);
    }
  }
}
