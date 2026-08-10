/**
 * Icon + number costs for interactive Table chrome (L32-04).
 * Leaves how-to-play / kit lore / action-log prose as text via formatCardCost.
 */

import type { ReactElement } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../asset-lookup';
import { spokenCost, type StructuredCost } from './structured-cost';

export interface CostDisplayProps {
  cost: StructuredCost;
  /** Optional multiplier prefix, e.g. elimination expiry `2×`. */
  multiplier?: number;
  className?: string;
  /** Icon pixel size; default 14 for compact chrome. */
  iconSize?: number;
}

const KIND_TO_RESOURCE: Record<StructuredCost['kind'], ResourceKind> = {
  points: 'point',
  lives: 'life',
  pointsPerLife: 'point',
  upgradePoint: 'upgradePoint',
};

function ResourceGlyph({
  kind,
  size,
}: {
  kind: ResourceKind;
  size: number;
}): ReactElement {
  return (
    <img
      src={getResourceIconUrl(kind)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function CostDisplay({
  cost,
  multiplier,
  className = '',
  iconSize = 14,
}: CostDisplayProps): ReactElement {
  const spoken = spokenCost(cost, multiplier);

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-sans tabular-nums ${className}`}
      title={spoken}
    >
      <span className="sr-only">{spoken}</span>
      {multiplier !== undefined && multiplier !== 1 ? (
        <span aria-hidden className="font-medium">
          {String(multiplier)}×
        </span>
      ) : null}
      <span aria-hidden className="inline-flex items-center gap-0.5 font-medium">
        {cost.kind === 'pointsPerLife' ? (
          <>
            <span>{cost.amount}</span>
            <ResourceGlyph kind="point" size={iconSize} />
            <span>/</span>
            <ResourceGlyph kind="life" size={iconSize} />
          </>
        ) : (
          <>
            <span>{cost.amount}</span>
            <ResourceGlyph kind={KIND_TO_RESOURCE[cost.kind]} size={iconSize} />
          </>
        )}
      </span>
    </span>
  );
}
