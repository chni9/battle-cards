/**
 * Recurring chips — technical spec v7 §6.5 (Q35); Lot 73 (L73-05).
 *
 * A chip per effect that ticks against the POV on its own next turn: a Curse the POV carries, and
 * each living opponent's Poison and Imposition. The amount is the catalog rate for the tier
 * (rules spec §5), never a prediction of what the next tick will take, because the damage depends
 * on resources the engine reads at tick time. `state` mirrors the engine's skip rules in
 * `apps/server/src/engine/turn/apply-persistent-effects.ts`, read from this recipient's own view
 * only (no hidden information, §6.3).
 *
 * Points Generator, Roulette, Super Absorber and Invisibility get no chip (§6.5 lists three cards).
 */

import type { PersistentEffectView, PlayingStateView } from '@card-battle/shared';

/** Cards that get a chip (§6.5). */
export type RecurringCardId = 'poison' | 'imposition' | 'curse';

export type RecurringAmount =
  | { kind: 'lives-per-turn'; lives: number } // Poison
  | { kind: 'points-above-floor'; maxPoints: number; floor: number } // Imposition
  | { kind: 'life-per-points-spent'; pointsPerLife: number }; // Curse

/** Rules spec §5 Poison (lines 224–225); mirrors server POISON_LIVES_BASE / _UPGRADED. */
export const CLIENT_POISON_LIVES = { base: 1, upgraded: 2 } as const;
/** Rules spec §5 Imposition (line 228): only points above 7; mirrors IMPOSITION_POINTS_FLOOR. */
export const CLIENT_IMPOSITION_FLOOR = 7;
/** Rules spec §5 Imposition (lines 228–229): cap 2 / 4; mirrors IMPOSITION_POINTS_BASE / _UPGRADED. */
export const CLIENT_IMPOSITION_CAP = { base: 2, upgraded: 4 } as const;
/** Rules spec §5 Curse (lines 217, 221): 1 life per 3 / 2 points spent; mirrors CURSE_POINTS_PER_LIFE_*. */
export const CLIENT_CURSE_POINTS_PER_LIFE = { base: 3, upgraded: 2 } as const;

/**
 * live = ticks on the POV's next turn; paused = the engine skips it (spec v7 §6.5);
 * ending = a Curse on the POV at ≤ 1 life, which the engine removes instead of draining
 * (apply-persistent-effects.ts applyOneCurse; designer 2026-10-27).
 */
export const RECURRING_CHIP_STATES = ['live', 'paused', 'ending'] as const;
export type RecurringChipState = (typeof RECURRING_CHIP_STATES)[number];

export interface RecurringChip {
  effectId: string;
  cardId: RecurringCardId;
  /** The POV for a Curse, the opponent holding the effect for Poison and Imposition. */
  ownerPlayerId: string;
  isUpgraded: boolean;
  amount: RecurringAmount;
  state: RecurringChipState;
}

/** The server skips a null or depleted counter (`apply-persistent-effects.ts`, victim ticks). */
function isTicking(effect: PersistentEffectView): boolean {
  return effect.counter !== null && effect.counter > 0;
}

/**
 * Chips in `view.players` order, and within a seat in its `activePersistentEffects` order. The
 * POV's own effects come from `self`, the private record that carries them (§6.3); Block and
 * elimination exist only on the POV's public `players` entry.
 */
export function recurringChips(view: PlayingStateView): readonly RecurringChip[] {
  if (view.isSpectator === true) {
    return [];
  }
  const pov = view.players.find((player) => player.id === view.you);
  if (pov === undefined || pov.isEliminated) {
    return [];
  }

  // `applyPersistentEffects` returns before every victim tick while the owner is Invisible
  // (lines 74–79), so Invisibility outranks every other state below, Curse's "ending" included.
  const invisible = view.self.activePersistentEffects.some(
    (effect) => effect.cardId === 'invisibility',
  );
  // `victimPersistentTicksPausedByBlock` guards Imposition and Poison only; Curse has no Block
  // check (rules spec §5 Block: "Curse and attacks are unchanged"). `blockAttacksForbidden` stays
  // true on the last chain turn, when `blockTurnsRemaining` is already 0.
  const blocked = pov.blockTurnsRemaining > 0 || pov.blockAttacksForbidden;
  // An up, upgraded Shield stops Imposition (`applyOneImposition`, line 217).
  const shieldStops = view.self.shield > 0 && view.self.shieldIsUpgraded;
  // Imposition takes only points above the floor, so it takes nothing at 7 (lines 221–227).
  const belowFloor = view.self.points <= CLIENT_IMPOSITION_FLOOR;

  const chips: RecurringChip[] = [];
  for (const player of view.players) {
    if (player.id === view.you) {
      for (const effect of view.self.activePersistentEffects) {
        if (effect.cardId !== 'curse') {
          continue;
        }
        chips.push({
          effectId: effect.id,
          cardId: 'curse',
          ownerPlayerId: view.you,
          isUpgraded: effect.isUpgraded,
          amount: {
            kind: 'life-per-points-spent',
            pointsPerLife: effect.isUpgraded
              ? CLIENT_CURSE_POINTS_PER_LIFE.upgraded
              : CLIENT_CURSE_POINTS_PER_LIFE.base,
          },
          // The engine never takes a Curse victim's last life: at ≤ 1 life it removes the Curse
          // (`applyOneCurse`, lines 268–272). Designer 2026-10-27.
          state: invisible ? 'paused' : view.self.lives <= 1 ? 'ending' : 'live',
        });
      }
      continue;
    }

    if (player.isEliminated) {
      continue;
    }
    for (const effect of player.activePersistentEffects) {
      if (!isTicking(effect)) {
        continue;
      }
      if (effect.cardId === 'poison') {
        chips.push({
          effectId: effect.id,
          cardId: 'poison',
          ownerPlayerId: player.id,
          isUpgraded: effect.isUpgraded,
          amount: {
            kind: 'lives-per-turn',
            lives: effect.isUpgraded ? CLIENT_POISON_LIVES.upgraded : CLIENT_POISON_LIVES.base,
          },
          state: invisible || blocked ? 'paused' : 'live',
        });
      } else if (effect.cardId === 'imposition') {
        chips.push({
          effectId: effect.id,
          cardId: 'imposition',
          ownerPlayerId: player.id,
          isUpgraded: effect.isUpgraded,
          amount: {
            kind: 'points-above-floor',
            maxPoints: effect.isUpgraded
              ? CLIENT_IMPOSITION_CAP.upgraded
              : CLIENT_IMPOSITION_CAP.base,
            floor: CLIENT_IMPOSITION_FLOOR,
          },
          state: invisible || blocked || shieldStops || belowFloor ? 'paused' : 'live',
        });
      }
    }
  }
  return chips;
}
