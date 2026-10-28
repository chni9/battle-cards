/**
 * The opponent seats in the arena — technical spec v7 §6.2–§6.4; Appendix A.7; L74-04.
 *
 * Renders the `SeatsModel` (`seats(view, box)`, L73) at `seatCenters(layout, arena)`: the arc
 * placements, or the grid rows laid out by the same pure helper the arrows (L74-06) and the drop
 * zones (L74-12) read. Order comes from the model; nothing is sorted here. The container never
 * takes a press, so the central plate below it stays tappable (L74-06); each seat re-enables
 * pointer events. A Classic view always has another seat, so there is no empty state.
 */

import type { ReactElement } from 'react';

import type { Size } from '../../view-model/seat-layout';
import type { SeatsModel } from '../../view-model/seats';
import { OpponentSeat } from './opponent-seat';
import { seatCenters } from './seat-geometry';

export interface ArenaSeatsProps {
  model: SeatsModel;
  /** The measured arena box `model` was computed for. */
  arena: Size;
  /** The seat whose sheet is open, else null. */
  tappedSeatId: string | null;
  /** A seat tap. Optional until L74-05 wires it to the seat sheet; without it a tap does nothing. */
  onOpenSeat?: (playerId: string) => void;
}

export function ArenaSeats({ model, arena, tappedSeatId, onOpenSeat }: ArenaSeatsProps): ReactElement {
  const byId = new Map(model.seats.map((seat) => [seat.playerId, seat]));
  return (
    <div
      data-zone="opponents"
      data-seat-layout={model.layout.kind}
      data-opponent-count={String(model.seats.length)}
      className="pointer-events-none absolute inset-0"
    >
      {seatCenters(model.layout, arena).map((center) => {
        const seat = byId.get(center.playerId);
        if (seat === undefined) {
          return null;
        }
        return (
          <OpponentSeat
            key={center.playerId}
            model={seat}
            center={center}
            tapped={center.playerId === tappedSeatId}
            onOpen={(id) => {
              onOpenSeat?.(id);
            }}
          />
        );
      })}
    </div>
  );
}
