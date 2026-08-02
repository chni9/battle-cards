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
  /** When set, portrait is a button (e.g. kit inspect Dialog). */
  onClick?: () => void;
  /** Accessible name when clickable. */
  ariaLabel?: string;
}

export function KitPortrait({
  kitId,
  nickname,
  isEliminated = false,
  className = '',
  onClick,
  ariaLabel,
}: KitPortraitProps): ReactElement {
  const src = kitId === null ? getOpponentPlaceholderUrl() : getKitPortraitUrl(kitId);
  const alt = kitId === null ? (nickname ?? 'Unknown kit') : `${kitId} portrait`;

  const frameClass = [
    'relative inline-block rounded-[length:var(--radius-card)]',
    isEliminated ? 'overflow-hidden' : 'overflow-visible',
    'border border-border bg-surface-raised',
    onClick !== undefined
      ? 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cta-purple focus-visible:ring-offset-2'
      : '',
    className,
  ].join(' ');

  const body = (
    <>
      <img
        src={src}
        alt={onClick !== undefined ? '' : alt}
        width={72}
        height={96}
        className={[
          'aspect-[3/4] w-full min-w-0 rounded-[length:var(--radius-card)] object-contain',
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
    </>
  );

  if (onClick !== undefined) {
    return (
      <button
        type="button"
        className={frameClass}
        onClick={onClick}
        aria-label={ariaLabel ?? `Inspect ${alt}`}
        data-zone="kit-portrait"
        data-eliminated={isEliminated ? 'true' : 'false'}
      >
        {body}
      </button>
    );
  }

  return (
    <span
      className={frameClass}
      data-zone="kit-portrait"
      data-eliminated={isEliminated ? 'true' : 'false'}
    >
      {body}
    </span>
  );
}
