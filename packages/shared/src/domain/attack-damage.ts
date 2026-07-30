/**
 * Attack damage by card and upgrade — rules spec §2.
 *
 * Kept beside the catalog so resolve-pending never hardcodes values (L2-04).
 */

import type { AttackCardId } from './card';

export const ATTACK_DAMAGE = {
  'basic-attack': { base: 1, upgraded: 3 },
  'strong-attack': { base: 2, upgraded: 4 },
  'super-attack': { base: 7, upgraded: 10 },
} as const satisfies Record<AttackCardId, { base: number; upgraded: number }>;

export function attackDamageFor(cardId: AttackCardId, isUpgraded: boolean): number {
  const row = ATTACK_DAMAGE[cardId];
  return isUpgraded ? row.upgraded : row.base;
}
