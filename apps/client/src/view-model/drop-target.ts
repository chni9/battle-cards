/**
 * Drop target — technical spec v7 §4.3, §6.6.3, §6.6.4, §12.2; Appendix A `table-use-target-routing`;
 * Lot 73 (L73-08).
 *
 * The intent a drop would send, from the pointer, the measured zone rectangles and the card's
 * `cardActions` model. Pure rectangle math with no DOM, so the drag logic is testable without
 * layout (§12.2). A drop sends only on a valid zone (§6.6.4): the model's `drop` zones already hold
 * only what an enabled Use or Sell allows, so no intent here can be one the server would reject. A
 * pre-send choice (Regeneration, Card Transformer) opens its choice and sends nothing (§6.6.3).
 */

import type { PlayCardPayload, SellCardPayload } from '@card-battle/shared';

import type { CardActionsModel } from './card-actions';

/** Viewport pixels. Half-open: it holds `[left, left + width)` and `[top, top + height)`. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The caller's measured rectangles. A seat is listed whether or not it accepts the card, so a
 * pointer over an invalid seat is told apart from empty space. `null` means the zone is not on
 * screen (the plate in a layout without one, Sell outside a drag).
 */
export interface DropZoneRects {
  seats: readonly { playerId: string; rect: Rect }[];
  plate: Rect | null;
  sell: Rect | null;
}

export type CardIntent =
  | { kind: 'playCard'; payload: PlayCardPayload }
  | { kind: 'sellCard'; payload: SellCardPayload };

/** An intent to send, or the sheet's pre-send choice to open with nothing sent (§6.6.3). */
export type DropResult =
  | { kind: 'intent'; intent: CardIntent }
  | { kind: 'open-choice'; choice: 'regeneration' | 'consume' };

/** Half-open, so two rects that share an edge never both contain a point. */
function contains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.left &&
    point.x < rect.left + rect.width &&
    point.y >= rect.top &&
    point.y < rect.top + rect.height
  );
}

function playCard(payload: PlayCardPayload): DropResult {
  return { kind: 'intent', intent: { kind: 'playCard', payload } };
}

/**
 * Null when no drag may start, over an invalid seat (§6.6.4: the card returns), outside every
 * valid zone, or inside two valid zones. Overlapping rects are a caller layout bug, resolved by
 * sending nothing. The no-target payload carries no `targetPlayerId` key at all, never an
 * explicit `undefined` (`exactOptionalPropertyTypes`, `PlayCardPayload`).
 */
export function dropTarget(
  pointer: Point,
  zoneRects: DropZoneRects,
  actions: CardActionsModel,
): DropResult | null {
  if (!actions.canDrag) {
    return null;
  }
  const hits: DropResult[] = [];
  for (const seat of zoneRects.seats) {
    if (!contains(seat.rect, pointer)) {
      continue;
    }
    if (!actions.drop.seatIds.includes(seat.playerId)) {
      return null;
    }
    hits.push(playCard({ instanceId: actions.instanceId, targetPlayerId: seat.playerId }));
  }
  if (
    actions.drop.plate !== null &&
    zoneRects.plate !== null &&
    contains(zoneRects.plate, pointer)
  ) {
    hits.push(
      actions.drop.plate === 'send'
        ? playCard({ instanceId: actions.instanceId })
        : { kind: 'open-choice', choice: actions.drop.plate },
    );
  }
  if (actions.drop.sell && zoneRects.sell !== null && contains(zoneRects.sell, pointer)) {
    hits.push({
      kind: 'intent',
      intent: { kind: 'sellCard', payload: { instanceId: actions.instanceId } },
    });
  }
  return hits.length === 1 ? (hits[0] ?? null) : null;
}
