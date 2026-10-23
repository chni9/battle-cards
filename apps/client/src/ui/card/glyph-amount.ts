/**
 * Amount + resource-icon model for CostAmount (technical spec v7 §6.6.1, L51-12, L72-11).
 * Structured costs reuse spokenCost; shield phrases are spoken as "N shield point(s)".
 */

import type { ResourceKind } from '../asset-lookup';
import type { IconName } from '../icons/icon-names';
import { spokenCost, type CostSign, type StructuredCost } from '../structured-cost';

export type GlyphAmount = StructuredCost | { readonly kind: 'shield'; readonly amount: number };

const GLYPH_AMOUNT_ICON: Readonly<Record<GlyphAmount['kind'], IconName>> = {
  points: 'point',
  pointsPerLife: 'point',
  lives: 'life',
  upgradePoint: 'upgrade',
  shield: 'shield',
};

export function glyphAmountIcon(amount: GlyphAmount): IconName {
  return GLYPH_AMOUNT_ICON[amount.kind];
}

export function glyphAmountFromResource(kind: ResourceKind, amount: number): GlyphAmount {
  switch (kind) {
    case 'point':
      return { kind: 'points', amount };
    case 'life':
      return { kind: 'lives', amount };
    case 'upgradePoint':
      return { kind: 'upgradePoint', amount };
    case 'shield':
      return { kind: 'shield', amount };
  }
}

function spokenShield(amount: number): string {
  return `${amount} ${amount === 1 ? 'shield point' : 'shield points'}`;
}

export function spokenGlyphAmount(
  amount: GlyphAmount,
  options: { readonly multiplier?: number; readonly signed?: CostSign } = {},
): string {
  if (amount.kind !== 'shield') {
    return options.signed === undefined
      ? spokenCost(amount, options.multiplier)
      : spokenCost(amount, options.multiplier, options.signed);
  }
  const base = spokenShield(amount.amount);
  const signedBase =
    options.signed === 'cost' ? `minus ${base}` : options.signed === 'gain' ? `plus ${base}` : base;
  if (options.multiplier !== undefined && options.multiplier !== 1) {
    return `${options.multiplier}×${signedBase}`;
  }
  return signedBase;
}
