/**
 * Structured cost model for interactive icon costs (L32-04).
 * Presentation lives in CostDisplay; shared formatCardCost stays for prose.
 */

import { formatCardCost, type Card, type CardCost } from '@card-battle/shared';

/** Client-local structured cost for icon presentation. */
export type StructuredCost =
  | { kind: 'points'; amount: number }
  | { kind: 'lives'; amount: number }
  | { kind: 'pointsPerLife'; amount: number }
  | { kind: 'upgradePoint'; amount: number };

/** Pay (`−`) vs receive (`+`) on interactive cost chrome. */
export type CostSign = 'cost' | 'gain';

export function costSignGlyph(signed: CostSign | undefined): string {
  if (signed === 'cost') {
    return '−';
  }
  if (signed === 'gain') {
    return '+';
  }
  return '';
}

export function spokenCost(
  cost: StructuredCost,
  multiplier: number | undefined,
  signed?: CostSign,
): string {
  const base =
    cost.kind === 'points'
      ? formatCardCost({ points: cost.amount })
      : cost.kind === 'lives'
        ? formatCardCost({ lives: cost.amount })
        : cost.kind === 'pointsPerLife'
          ? formatCardCost({ pointsPerLife: cost.amount })
          : `${String(cost.amount)} ${cost.amount === 1 ? 'upgrade point' : 'upgrade points'}`;

  const signedBase =
    signed === 'cost' ? `minus ${base}` : signed === 'gain' ? `plus ${base}` : base;

  if (multiplier !== undefined && multiplier !== 1) {
    return `${String(multiplier)}×${signedBase}`;
  }
  return signedBase;
}

/** Map a catalog `CardCost` to a structured icon cost, or null when empty. */
export function structuredCostFromCardCost(cost: CardCost | undefined): StructuredCost | null {
  if (cost === undefined) {
    return null;
  }
  if (cost.pointsPerLife !== undefined && cost.pointsPerLife > 0) {
    return { kind: 'pointsPerLife', amount: cost.pointsPerLife };
  }
  if (cost.points !== undefined && cost.points > 0) {
    return { kind: 'points', amount: cost.points };
  }
  if (cost.lives !== undefined && cost.lives > 0) {
    return { kind: 'lives', amount: cost.lives };
  }
  return null;
}

/**
 * Play cost for a held copy — Regeneration upgraded rate is 2 pts/life
 * (rules §3; mirrors formatPlayCost).
 */
export function structuredPlayCost(card: Card, isUpgraded: boolean): StructuredCost | null {
  if (
    card.id === 'regeneration' &&
    isUpgraded &&
    card.cost.pointsPerLife !== undefined &&
    card.cost.pointsPerLife > 0
  ) {
    return { kind: 'pointsPerLife', amount: 2 };
  }
  return structuredCostFromCardCost(card.cost);
}

/** Spoken string for aria-label (keeps native control labels textual). */
export function costAriaLabel(cost: StructuredCost | null, signed?: CostSign): string {
  if (cost === null) {
    return '';
  }
  if (signed === undefined) {
    return spokenCost(cost, undefined);
  }
  return spokenCost(cost, undefined, signed);
}
