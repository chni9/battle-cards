/**
 * Player avatar (technical spec v7 §5.3, §6.2): a round arcade-chrome frame with the portrait,
 * or, without one, a disc in the seat hue (`v7SeatColor`, `--text-2` for an unknown seat)
 * showing the name's initial in `--text-on-cta`, which every seat hue clears at 4.5:1.
 *
 * The accessible name is `alt`, else the player name (§11). An eliminated avatar turns
 * grayscale and carries the `eliminated` cross in a `--bg-0` well outside the filtered face,
 * so the cross keeps its color and never sits on a seat hue close to `--danger`
 * (DESIGN.md › Icons). The root exposes `data-seat-index` when the seat is known and
 * `data-eliminated`.
 */

import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { V7_COLORS, v7SeatColor } from '../palette';
import { avatarInitial } from './avatar-initial';
import { CHROME_DISC_CLASS } from './chrome-classes';

export interface AvatarProps {
  name: string;
  seatIndex: number | null;
  imageUrl?: string;
  alt?: string;
  eliminated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS = { sm: 'size-8', md: 'size-11', lg: 'size-16' } as const;
const INITIAL_CLASS = { sm: 'text-v7-body', md: 'text-v7-title', lg: 'text-v7-display' } as const;
const CROSS_SIZE = { sm: 12, md: 16, lg: 22 } as const;

export function Avatar({
  name,
  seatIndex,
  imageUrl,
  alt,
  eliminated = false,
  size = 'md',
  className,
}: AvatarProps): ReactElement {
  const accessibleName = alt ?? name;
  const faceClass = `size-full rounded-full ${eliminated ? 'grayscale' : ''}`;
  return (
    <span
      data-eliminated={eliminated ? 'true' : 'false'}
      {...(seatIndex !== null ? { 'data-seat-index': String(seatIndex) } : {})}
      className={[
        'relative inline-flex shrink-0 bg-v7-panel-2',
        CHROME_DISC_CLASS,
        SIZE_CLASS[size],
        className ?? '',
      ].join(' ')}
    >
      {imageUrl !== undefined ? (
        <img src={imageUrl} alt={accessibleName} draggable={false} className={`${faceClass} object-cover`} />
      ) : (
        <span
          role="img"
          aria-label={accessibleName}
          style={{ backgroundColor: seatIndex === null ? V7_COLORS['text-2'] : v7SeatColor(seatIndex) }}
          className={`${faceClass} flex items-center justify-center`}
        >
          <span aria-hidden="true" className={`font-v7-display leading-none text-v7-text-on-cta ${INITIAL_CLASS[size]}`}>
            {avatarInitial(name)}
          </span>
        </span>
      )}
      {eliminated ? (
        <span className="absolute -right-1.5 -bottom-1.5 inline-flex items-center justify-center rounded-full bg-v7-bg-0 p-0.5">
          <Icon name="eliminated" size={CROSS_SIZE[size]} />
        </span>
      ) : null}
    </span>
  );
}
