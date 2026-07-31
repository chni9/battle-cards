/**
 * Kit portrait or unrevealed opponent placeholder — L10-04 / L10-05.
 * Eliminated: greyscale + opacity + “Eliminated” badge (no per-kit dead art).
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
        className={[
          'aspect-[3/4] w-[4.5rem] object-cover',
          isEliminated ? 'opacity-55 grayscale' : '',
        ].join(' ')}
        draggable={false}
      />
      {isEliminated ? (
        <span
          className={[
            'absolute inset-x-0 bottom-0 bg-ink/75 px-1 py-0.5',
            'text-center font-sans text-[9px] font-bold uppercase tracking-wide',
            'text-cta-label-on-dark',
          ].join(' ')}
        >
          Eliminated
        </span>
      ) : null}
    </span>
  );
}
