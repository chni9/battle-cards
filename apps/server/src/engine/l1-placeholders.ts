/**
 * Lot 1 placeholder starting values — backlog L1-03.
 * Replaced by real kit distribution in L4-02. Do not treat as game rules.
 */

import type { KitId } from '@card-battle/shared';

/** Lives / points / upgrade points / draw for every seated player until kits land. */
export const L1_PLACEHOLDER_RESOURCES = {
  lives: 10,
  points: 0,
  upgradePoints: 0,
  draw: 1,
} as const;

/** Enough basic-attack copies for early Lot 1 elimination tests (legacy; start hand is now all shared cards until L4-02). */
export const L1_BASIC_ATTACK_COPIES = 10;

/**
 * Inert kit label on every L1 player. Traits are **not** applied until lot 4 —
 * resources come from `L1_PLACEHOLDER_RESOURCES`, not the kit roster.
 */
export const L1_PLACEHOLDER_KIT_ID: KitId = 'untouchable';
