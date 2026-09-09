/**
 * Attack damage by card and upgrade — rules spec §2.
 *
 * Kept beside the catalog so resolve-pending never hardcodes values (L2-04).
 */

import { isAttackCardId, type AttackCardId } from './card';

export const ATTACK_DAMAGE = {
  'basic-attack': { base: 1, upgraded: 3 },
  'strong-attack': { base: 2, upgraded: 4 },
  'super-attack': { base: 7, upgraded: 10 },
  // Upgrade changes redirectability, not damage (rules spec §5 / tech v4 §4.1).
  'mega-attack': { base: 20, upgraded: 20 },
} as const satisfies Record<AttackCardId, { base: number; upgraded: number }>;

export function attackDamageFor(cardId: AttackCardId, isUpgraded: boolean): number {
  const row = ATTACK_DAMAGE[cardId];
  return isUpgraded ? row.upgraded : row.base;
}

/**
 * Catalog attack damage × pending multiplier — L56-04.
 * `null` when the card is not an attack (Tax / Absorber / Super Mirror the card).
 */
export function listedAttackDamage(
  cardId: string,
  isUpgraded: boolean,
  multiplier = 1,
): number | null {
  if (!isAttackCardId(cardId)) {
    return null;
  }
  return attackDamageFor(cardId, isUpgraded) * multiplier;
}
