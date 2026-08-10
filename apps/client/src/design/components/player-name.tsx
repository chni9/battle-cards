/**
 * Nickname painted in the player's seat-index color — L39-03.
 */

import type { ReactElement } from 'react';

import {
  clampSeatIndex,
  seatIndexOf,
  seatNameStyle,
  type SeatPlayersView,
} from '../seat-colors';

export interface PlayerNameProps {
  nickname: string;
  /** When set with `view`, resolves seat from `view.players` index. */
  playerId?: string;
  view?: SeatPlayersView;
  /** Explicit seat when `view`/`playerId` are unavailable. */
  seatIndex?: number;
  className?: string;
  /** Possessive form: render `nickname` + `'s` (only nickname is colored). */
  possessive?: boolean;
}

export function PlayerName({
  nickname,
  playerId,
  view,
  seatIndex,
  className = '',
  possessive = false,
}: PlayerNameProps): ReactElement {
  const resolved =
    seatIndex !== undefined
      ? clampSeatIndex(seatIndex)
      : view !== undefined && playerId !== undefined
        ? seatIndexOf(view, playerId)
        : null;

  const style = resolved !== null ? seatNameStyle(resolved) : undefined;

  return (
    <>
      <span
        className={['font-semibold', className].filter((part) => part.length > 0).join(' ')}
        style={style}
        data-seat-index={resolved !== null ? String(resolved) : undefined}
      >
        {nickname}
      </span>
      {possessive ? "'s" : null}
    </>
  );
}
