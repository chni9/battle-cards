/**
 * Compact life-icon + number — L56-04 / L56-06.
 * `turns` is a remaining-duration count without the heart (L58-06).
 * No ResourceIcon flyout or caption (too heavy for 22px faces).
 */

import type { ReactElement } from 'react';

import { getResourceIconUrl } from '../asset-lookup';

export type LifeCountBadgeKind = 'damage' | 'card-lives' | 'turns';

export interface LifeCountBadgeProps {
  amount: number;
  kind: LifeCountBadgeKind;
  className?: string;
  iconSize?: number;
}

function spokenLabel(kind: LifeCountBadgeKind, amount: number): string {
  if (kind === 'damage') {
    return `${String(amount)} damage`;
  }

  if (kind === 'turns') {
    return amount === 1 ? '1 turn remaining' : `${String(amount)} turns remaining`;
  }

  return amount === 1 ? '1 card life' : `${String(amount)} card lives`;
}

export function LifeCountBadge({
  amount,
  kind,
  className = '',
  iconSize = 12,
}: LifeCountBadgeProps): ReactElement {
  const label = spokenLabel(kind, amount);

  return (
    <span
      className={`inline-flex items-center gap-px font-sans tabular-nums ${className}`}
      aria-label={label}
      title={label}
      data-life-count={amount}
      data-life-count-kind={kind}
    >
      {kind !== 'turns' ? (
        <img
          src={getResourceIconUrl('life')}
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0 object-contain"
          style={{ width: iconSize, height: iconSize }}
          aria-hidden
        />
      ) : null}
      <span aria-hidden className="font-semibold leading-none">
        {amount}
      </span>
    </span>
  );
}
