/**
 * The claim picker for a disconnected living seat (technical spec v7 §7.7: a V7 sheet over the
 * Lobby, the Table and End, where any dismissal is Stay; §6.7: Esc closes only the top sheet).
 * PROTOCOL_VERSION 32 / L57-13: nickname and seat hue, no auto-match. L57-15: a sole seat is
 * pre-selected. L57-16: Stay is explicit, so Esc, the backdrop, a swipe and the Stay button all
 * call `onStay`. Plan A.9 ruling 5 (the Sit here latch) and Review Focus 5 (a pick that leaves the
 * set). L76-16.
 */

import type { ClaimableSeatView } from '@card-battle/shared';
import { useRef, useState, type ReactElement } from 'react';

import { v7SeatColor } from '../ui/palette';
import { Button } from '../ui/primitives/button';
import { CHROME_FOCUS_CLASS, CHROME_SHAPE_SM_CLASS } from '../ui/primitives/chrome-classes';
import { Dialog } from '../ui/primitives/dialog';
import { seatIndexOf } from '../ui/seat-colors';
import { claimSelection } from './claim-seat';

export interface ClaimSeatDialogProps {
  open: boolean;
  seats: readonly ClaimableSeatView[];
  playerIds: readonly string[];
  hostPlayerId?: string;
  stayLabel: string;
  onClaim: (playerId: string) => void;
  onStay: () => void;
}

export function ClaimSeatDialog({
  open,
  seats,
  playerIds,
  hostPlayerId,
  stayLabel,
  onClaim,
  onStay,
}: ClaimSeatDialogProps): ReactElement {
  const [picked, setPicked] = useState<string | null>(null);
  const selectedId = claimSelection(seats, picked);
  // One Sit here per claimable set. App keeps this dialog mounted while the server answers, so a
  // double tap would send twice. A new set (someone else sat, a seat dropped) is a new question
  // and re-arms it. The ref is read and written only in this handler, never during render (the
  // React Compiler lint), as `screens/arena/top-bar.tsx` does for its confirm.
  const seatsKey = seats.map((seat) => seat.playerId).join('|');
  const claimedFor = useRef<string | null>(null);
  const sitHere = (): void => {
    if (selectedId === null || claimedFor.current === seatsKey) {
      return;
    }
    claimedFor.current = seatsKey;
    onClaim(selectedId);
  };

  return (
    <Dialog
      open={open}
      title="Sit as a disconnected player?"
      onClose={onStay}
      actions={
        <>
          <Button variant="secondary" onClick={onStay}>
            {stayLabel}
          </Button>
          <Button variant="primary" disabled={selectedId === null} focusableWhenDisabled onClick={sitHere}>
            Sit here
          </Button>
        </>
      }
    >
      <p className="font-v7-body text-v7-body font-bold text-v7-text">
        Nicknames are not unique. Pick the seat by color, or keep watching.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {seats.map((seat) => {
          const index = seatIndexOf({ players: playerIds.map((id) => ({ id })) }, seat.playerId);
          const selected = selectedId === seat.playerId;
          const host = hostPlayerId !== undefined && seat.playerId === hostPlayerId;

          return (
            <li key={seat.playerId}>
              <button
                type="button"
                aria-pressed={selected}
                data-claim-seat={seat.playerId}
                onClick={() => {
                  setPicked(seat.playerId);
                }}
                className={[
                  'flex min-h-11 w-full items-center gap-3 bg-v7-panel-2 px-3 py-2 text-left',
                  CHROME_SHAPE_SM_CLASS,
                  CHROME_FOCUS_CLASS,
                  selected ? 'ring-(length:--chrome-outline-width) ring-v7-cta' : '',
                ].join(' ')}
              >
                <span
                  data-claim-seat-dot=""
                  aria-hidden="true"
                  className="size-6 shrink-0 rounded-full border-(length:--chrome-outline-width) border-v7-ink"
                  style={{ backgroundColor: v7SeatColor(index ?? 0) }}
                />
                <span className="min-w-0 wrap-anywhere font-v7-display text-v7-body leading-tight text-v7-text">
                  {seat.nickname}
                </span>
                {host ? (
                  <span className="font-v7-body text-v7-caption font-extrabold uppercase text-v7-text-2">Host</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
