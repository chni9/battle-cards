/**
 * One seat as a toggle button — technical spec v7 §6.6.2 (Assassin multi-attack picks a seat per
 * row), §6.3 (no hidden information), §11 (accessible names); L74-11. L74-13's Unspy picker
 * reuses it.
 *
 * The avatar is always the seat-hue initial, never a kit portrait, so the button needs no
 * visibility logic and can never show a hidden kit. An eliminated seat (a riposte corpse, §6.6.2)
 * reads '{nick}, eliminated' (`eliminatedPortraitLabel`). The visible name truncates and `title`
 * keeps it whole; the accessible name is always the full nickname.
 */

import type { PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { Avatar } from '../../ui/primitives/avatar';
import {
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  chromePressClass,
  motionAttribute,
} from '../../ui/primitives/chrome-classes';
import { PlayerName } from '../../ui/seat/player-name';
import { eliminatedPortraitLabel } from '../../ui/ui-copy';
import { seatColorIndexOf } from '../../view-model/seats';
import { nicknameOf } from '../../view-model/table-helpers';

export interface SeatChoiceButtonProps {
  view: PlayingStateView;
  playerId: string;
  selected: boolean;
  onSelect: () => void;
}

export function SeatChoiceButton({ view, playerId, selected, onSelect }: SeatChoiceButtonProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const nickname = nicknameOf(view, playerId);
  const seatIndex = seatColorIndexOf(view, playerId);
  const eliminated = view.players.find((player) => player.id === playerId)?.isEliminated === true;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={eliminated ? eliminatedPortraitLabel(nickname) : nickname}
      title={nickname}
      data-motion={motionAttribute(reduced)}
      onClick={onSelect}
      className={[
        CHROME_SHAPE_SM_CLASS,
        CHROME_FOCUS_CLASS,
        'min-h-11 max-w-full bg-v7-panel-2 px-2',
        selected ? 'ring-4 ring-v7-cta' : '',
        chromePressClass(reduced),
      ]
        .filter((part) => part !== '')
        .join(' ')}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={nickname} seatIndex={seatIndex} eliminated={eliminated} size="sm" />
        <PlayerName nickname={nickname} seatIndex={seatIndex} className="truncate" />
      </span>
    </button>
  );
}
