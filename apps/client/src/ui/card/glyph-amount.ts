/**
 * Glyph amount model — technical spec v7 §6.6.1, L51-12. One shape for everything the V7 text
 * pieces draw as number plus resource icon: the structured costs of `ui/structured-cost.ts`
 * and the shield amount that only catalog prose carries ("Gain 4 shield points").
 *
 * Structured costs speak `spokenCost`'s short wording ("3 pts", "3 pts/life"), so a cost reads
 * the same here as on every other control. A shield amount speaks "N shield point(s)" and wraps
 * its sign and multiplier the same way `spokenCost` wraps them.
 */

import type { ResourceKind } from '../asset-lookup';
import type { IconName } from '../icons/icon-names';
import { spokenCost, type CostSign, type StructuredCost } from '../structured-cost';
import { shieldPointsLabel } from '../ui-copy';

export type GlyphAmount = StructuredCost | { readonly kind: 'shield'; readonly amount: number };

/** `pointsPerLife` draws a point icon first (and a life icon after the slash), so it maps to `point`. */
const AMOUNT_ICON: Readonly<Record<GlyphAmount['kind'], IconName>> = {
  points: 'point',
  pointsPerLife: 'point',
  lives: 'life',
  upgradePoint: 'upgrade',
  shield: 'shield',
};

export function glyphAmountIcon(amount: GlyphAmount): IconName {
  return AMOUNT_ICON[amount.kind];
}

/** The tokenizer's resource kind (`ui/effect-text-tokens.ts`) as an amount to draw. */
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

export function spokenGlyphAmount(
  amount: GlyphAmount,
  options: { readonly multiplier?: number; readonly signed?: CostSign } = {},
): string {
  const { multiplier, signed } = options;
  if (amount.kind !== 'shield') {
    return spokenCost(amount, multiplier, signed);
  }

  const base = shieldPointsLabel(amount.amount);
  const signedBase = signed === 'cost' ? `minus ${base}` : signed === 'gain' ? `plus ${base}` : base;
  return multiplier !== undefined && multiplier !== 1 ? `${String(multiplier)}×${signedBase}` : signedBase;
}
