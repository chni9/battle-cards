/**
 * Claim a disconnected living seat — PROTOCOL_VERSION 32 / L57-13.
 * Nickname + seat color; no auto-match. Stay spectating / keep seat is explicit.
 */

import type { ClaimableSeatView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { seatColorHex, seatIndexOf } from '../design/seat-colors';

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

  return (
    <Dialog
      open={open}
      title="Sit as a disconnected player?"
      onClose={onStay}
      actions={
        <>
          <Button compact type="button" variant="orange" onClick={onStay}>
            {stayLabel}
          </Button>
          <Button
            compact
            type="button"
            variant="green"
            disabled={picked === null}
            onClick={() => {
              if (picked !== null) {
                onClaim(picked);
              }
            }}
          >
            Sit here
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        Nicknames are not unique. Pick the seat by color, or keep watching.
      </p>
      <ul className="mt-3 space-y-2">
        {seats.map((seat) => {
          const index = seatIndexOf(
            { players: playerIds.map((id) => ({ id })) },
            seat.playerId,
          );
          const selected = picked === seat.playerId;
          const host = hostPlayerId !== undefined && seat.playerId === hostPlayerId;

          return (
            <li key={seat.playerId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setPicked(seat.playerId);
                }}
                className={[
                  'flex min-h-11 w-full items-center gap-3 rounded-[length:var(--radius-card)] border px-3 py-2 text-left',
                  selected
                    ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                    : 'border-border-soft bg-surface-raised hover:border-border',
                ].join(' ')}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: seatColorHex(index ?? 0) }}
                  aria-hidden
                />
                <span className="font-medium text-ink">{seat.nickname}</span>
                {host ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Host
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
