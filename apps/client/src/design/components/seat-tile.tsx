/**
 * Shop-style seat picker tile — L44-01 / technical spec v6 §6.4.
 * Caller passes kitId from current visibility; this tile does not invent Spy rules.
 */

import type { KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { seatIndexOf, seatZoneStyle, type SeatPlayersView } from '../seat-colors';
import { choiceTileClassName, choiceTileSelectedStyle } from './choice-tile-chrome';
import { KitPortrait } from './kit-portrait';
import { PlayerName } from './player-name';

export interface SeatTileProps {
  view: SeatPlayersView;
  playerId: string;
  nickname: string;
  kitId: KitId | null;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function SeatTile({
  view,
  playerId,
  nickname,
  kitId,
  selected,
  onSelect,
  disabled = false,
}: SeatTileProps): ReactElement {
  const seat = seatIndexOf(view, playerId);
  const zoneStyle =
    seat !== null ? seatZoneStyle(seat, { intensity: 'soft' }) : undefined;
  const style = selected ? choiceTileSelectedStyle(zoneStyle) : zoneStyle;

  return (
    <div className="p-2">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={nickname}
        disabled={disabled}
        onClick={onSelect}
        className={[
          choiceTileClassName({ selected, disabled }),
          selected ? 'relative z-[1]' : '',
        ].join(' ')}
        style={style}
      >
        <KitPortrait kitId={kitId} nickname={nickname} className="w-full max-w-[5.5rem]" />
        <PlayerName
          nickname={nickname}
          playerId={playerId}
          view={view}
          className="mt-1 w-full truncate text-center text-xs"
        />
      </button>
    </div>
  );
}
