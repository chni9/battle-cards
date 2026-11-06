/**
 * The opponent seats in the arena — technical spec v7 §6.2–§6.4; Appendix A.7; L74-04.
 *
 * Renders the `SeatsModel` (`seats(view, box)`, L73) at `seatCenters(layout, arena)`: the arc
 * placements, or the grid rows laid out by the same pure helper the arrows (L74-06) and the drop
 * zones (L74-12) read. Order comes from the model; nothing is sorted here. The container never
 * takes a press, so the central plate below it stays tappable (L74-06); each seat re-enables
 * pointer events. A Classic view always has another seat, so there is no empty state.
 *
 * While a card is targeted (L74-10, §6.6.5), each seat gets its `SeatTarget` from the live seat
 * set, and focus moves to the first valid seat in DOM order whenever a new card is targeted.
 *
 * During a hand drag (L74-12, §6.6.3), `dropHighlight` lights the seats that take the card.
 *
 * Each seat is drawn at its mode's box, `model.layout.mode` (L75-02, §6.4). `data-seat-layout` is
 * `arc`, `grid`, or `band`: the landscape-compact top band, an arc in the layout model (L75-03, §6.4).
 *
 * L75-04 (§6.12; plan A.8.6, K7): `tutorial` marks every seat root `opponent` for the board tour, or
 * the portrait of each listed seat `opponent-portrait` for the Look gate.
 */

import { useEffect, useRef, type ReactElement } from 'react';

import type { Size } from '../../view-model/seat-layout';
import type { SeatsModel } from '../../view-model/seats';
import type { SeatDropHighlight } from './hand-drag';
import { OpponentSeat } from './opponent-seat';
import { seatCenters } from './seat-geometry';
import { seatTargetFor, type SeatTargeting } from './targeting-model';

export interface ArenaSeatsProps {
  model: SeatsModel;
  /** The measured arena box `model` was computed for. */
  arena: Size;
  /** The seat whose sheet is open, else null. */
  tappedSeatId: string | null;
  /** A seat tap. Optional until L74-05 wires it to the seat sheet; without it a tap does nothing. */
  onOpenSeat?: (playerId: string) => void;
  /** L74-10: the live targeting (`liveTargeting`), else absent. */
  targeting?: SeatTargeting;
  /** L74-12: the seats a dragged card may land on, and the one under the pointer; absent outside a drag. */
  dropHighlight?: SeatDropHighlight;
  /** L75-04: the tour's mark on every seat (`seats`), or the Look gate's on these seats' portraits. */
  tutorial?: { readonly seats: boolean; readonly portraitIds: readonly string[] };
}

/** `over` under the pointer, `valid` when the seat takes the card, else no highlight. */
function seatDrop(highlight: SeatDropHighlight | undefined, playerId: string): 'valid' | 'over' | null {
  if (highlight === undefined) return null;
  if (highlight.overId === playerId) return 'over';
  return highlight.seatIds.includes(playerId) ? 'valid' : null;
}

export function ArenaSeats({
  model,
  arena,
  tappedSeatId,
  onOpenSeat,
  targeting,
  dropHighlight,
  tutorial,
}: ArenaSeatsProps): ReactElement {
  const byId = new Map(model.seats.map((seat) => [seat.playerId, seat]));
  const rootRef = useRef<HTMLDivElement>(null);
  const focusKey = targeting?.key ?? null;
  useEffect(() => {
    if (focusKey === null) return;
    rootRef.current?.querySelector<HTMLElement>('[data-target-seat="valid"]')?.focus();
  }, [focusKey]);
  return (
    <div
      ref={rootRef}
      data-zone="opponents"
      data-seat-layout={model.layout.kind === 'arc' && model.layout.mode === 'landscape-compact' ? 'band' : model.layout.kind}
      data-opponent-count={String(model.seats.length)}
      className="pointer-events-none absolute inset-0"
    >
      {seatCenters(model.layout, arena).map((center) => {
        const seat = byId.get(center.playerId);
        if (seat === undefined) {
          return null;
        }
        const target = seatTargetFor(targeting, center.playerId);
        const drop = seatDrop(dropHighlight, center.playerId);
        const highlight =
          tutorial === undefined
            ? undefined
            : tutorial.seats
              ? ('opponent' as const)
              : tutorial.portraitIds.includes(center.playerId)
                ? ('opponent-portrait' as const)
                : undefined;
        return (
          <OpponentSeat
            key={center.playerId}
            model={seat}
            center={center}
            tapped={center.playerId === tappedSeatId}
            mode={model.layout.mode}
            {...(model.layout.box !== undefined ? { box: model.layout.box } : {})}
            {...(target !== null ? { target } : {})}
            {...(drop !== null ? { drop } : {})}
            {...(highlight !== undefined ? { tutorialHighlight: highlight } : {})}
            onOpen={(id) => {
              onOpenSeat?.(id);
            }}
          />
        );
      })}
    </div>
  );
}
