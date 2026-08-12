/**
 * Pluggable card-id prior for opponent hand sampling — technical spec v5 §4.2
 * (L34-04 / #V5-2). Shop supply is unlimited, so sampling is a frequency prior
 * over zone catalogs, not a constrained deal from remaining copies.
 */

import type { CardId } from '@card-battle/shared';

export interface HandPrior {
  /** Weight for picking cardId into a hand slot of the given zone. */
  weight(cardId: CardId, zone: 'action' | 'attack'): number;
}

/** Uniform over the zone catalog (v1 prior, decisions.md 2026-08-12 / L34-01). */
export const uniformZonePrior: HandPrior = {
  weight: () => 1,
};
