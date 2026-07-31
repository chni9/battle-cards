/**
 * Resource icon + value — technical spec v2 §5, L10-04.
 */

import type { ReactElement } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../asset-lookup';

export interface ResourceIconProps {
  kind: ResourceKind;
  value: number;
  label?: string;
  className?: string;
}

const DEFAULT_LABELS: Record<ResourceKind, string> = {
  life: 'Lives',
  point: 'Points',
  shield: 'Shield',
  upgradePoint: 'Upgrade points',
};

export function ResourceIcon({
  kind,
  value,
  label = DEFAULT_LABELS[kind],
  className = '',
}: ResourceIconProps): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans tabular-nums text-ink ${className}`}
      title={label}
    >
      <img
        src={getResourceIconUrl(kind)}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0 object-contain"
        aria-hidden
      />
      <span className="text-sm font-medium">
        <span className="sr-only">{label} </span>
        {value}
      </span>
    </span>
  );
}
