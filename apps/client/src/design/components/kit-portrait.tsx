/**
 * Kit portrait or unrevealed opponent placeholder — L10-04.
 * Elimination treatment lands in L10-05.
 */

import type { KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { getKitPortraitUrl, getOpponentPlaceholderUrl } from '../asset-lookup';

export interface KitPortraitProps {
  kitId: KitId | null;
  nickname?: string;
  isEliminated?: boolean;
  className?: string;
}

export function KitPortrait({
  kitId,
  nickname,
  isEliminated = false,
  className = '',
}: KitPortraitProps): ReactElement {
  const src = kitId === null ? getOpponentPlaceholderUrl() : getKitPortraitUrl(kitId);
  const alt = kitId === null ? (nickname ?? 'Unknown kit') : `${kitId} portrait`;

  return (
    <span
      className={[
        'relative inline-block overflow-hidden rounded-[length:var(--radius-card)]',
        'border border-border bg-surface-raised',
        className,
      ].join(' ')}
      data-eliminated={isEliminated ? 'true' : 'false'}
    >
      <img
        src={src}
        alt={alt}
        width={72}
        height={96}
        className="aspect-[3/4] w-[4.5rem] object-cover"
        draggable={false}
      />
    </span>
  );
}
