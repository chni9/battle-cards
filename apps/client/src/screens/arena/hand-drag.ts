/**
 * Drag from the hand, pure helpers — technical spec v7 §6.6.3 (the drop table, the Sell zone),
 * §6.6.4 (an intent leaves only on a drop on a valid zone), §6.6.5 (a lift past a threshold,
 * the hand scroll), §12.2 (drag logic is tested without layout); Lot 74 plan Appendix A.7 (L74-12).
 *
 * Every zone and intent comes from the L73 view-model: `cardActions(...).drop` says where a card
 * may land and `dropTarget` turns a pointer into an intent, so nothing here re-derives a target
 * or a price (golden rule 8). A drop resolves against the card's model on the latest view
 * (Review Focus 4): a card that left the hand, a passed turn or a lock sends nothing.
 * `measureDropZones` is the one DOM read; everything else is rect math.
 */

import type { PlayingStateView } from '@card-battle/shared';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

import type { ActionContext } from '../../view-model/action-lock';
import { cardActions, type CardActionsModel, type DropZones } from '../../view-model/card-actions';
import { dropTarget, type DropResult, type DropZoneRects, type Point, type Rect } from '../../view-model/drop-target';
import type { ArenaCommit, CommitContext } from './arena-commit';
import { liveCardRefFor } from './card-sheet-source';
import type { HandCardSource } from './hand-fan-model';

/** §6.6.5 "~8 px": the move a press needs before it lifts the card or hands over to the scroll. */
export const HAND_DRAG_LIFT_PX = 8;
/** Designer Q19 default: the Sell zone box. */
export const SELL_ZONE_SIZE = { width: 96, height: 72 } as const;
/** Between the Sell zone's bottom edge and the hand's top edge. */
export const SELL_ZONE_GAP_PX = 8;
/** From the Sell zone to the screen edge opposite the drag origin. */
export const SELL_ZONE_INSET_PX = 16;

export type HandGesture = 'pending' | 'scroll' | 'lift';

/** lift: |dy| > 8 and |dy| > |dx|; scroll: |dx| > 8 and |dx| >= |dy|; else pending. A tie is a scroll. */
export function classifyHandGesture(delta: Point): HandGesture {
  const dx = Math.abs(delta.x);
  const dy = Math.abs(delta.y);
  if (dy > HAND_DRAG_LIFT_PX && dy > dx) {
    return 'lift';
  }
  if (dx > HAND_DRAG_LIFT_PX && dx >= dy) {
    return 'scroll';
  }
  return 'pending';
}

/** §6.6.3: never off-turn or locked (canDrag), never while targeting (L74-10). L75 adds the tour and Look gate. */
export function canStartHandDrag(actions: CardActionsModel, targetingActive: boolean): boolean {
  return actions.canDrag && !targetingActive;
}

/** The card's model on the latest view (`liveCardRefFor`), or null once it left the hand. */
export function latestHeldActions(
  view: PlayingStateView,
  ctx: ActionContext,
  source: HandCardSource,
): CardActionsModel | null {
  const ref = liveCardRefFor(source, view);
  return ref.zone === 'read-only' ? null : cardActions(view, ref, ctx);
}

/** Null once the card left the hand; `dropTarget` itself returns null when the model cannot drag. */
export function resolveDrop(pointer: Point, rects: DropZoneRects, latest: CardActionsModel | null): DropResult | null {
  return latest === null ? null : dropTarget(pointer, rects, latest);
}

export type DropChoice = Extract<DropResult, { kind: 'open-choice' }>['choice'];
export type DropOutcome = 'sent' | 'choice' | 'returned';

/**
 * An intent leaves through the arena commit (§6.6.4); a pre-send choice opens and sends nothing
 * (§6.6.3); anything else returns the card. `context` (L74-17) rides with the intent so its ghost
 * flies from the release point; without one, `commit` gets the intent alone (plan D4). A commit
 * that did not go out (a veto) returns the card too, so it springs back (L74 Part 2 final review).
 */
export function dispatchDrop(
  result: DropResult | null,
  commit: ArenaCommit,
  openChoice: (choice: DropChoice) => void,
  context?: CommitContext,
): DropOutcome {
  if (result === null) {
    return 'returned';
  }
  switch (result.kind) {
    case 'intent': {
      const sent = context === undefined ? commit(result.intent) : commit(result.intent, context);
      return sent ? 'sent' : 'returned';
    }
    case 'open-choice':
      openChoice(result.choice);
      return 'choice';
  }
}

export type HoveredDropZone =
  | { readonly kind: 'seat'; readonly playerId: string }
  | { readonly kind: 'plate' }
  | { readonly kind: 'sell' };

/** The valid zone under the pointer, read off the intent the drop would send. */
export function hoveredZoneOf(result: DropResult | null): HoveredDropZone | null {
  if (result === null) {
    return null;
  }
  if (result.kind === 'open-choice') {
    return { kind: 'plate' };
  }
  const { intent } = result;
  switch (intent.kind) {
    case 'playCard':
      return intent.payload.targetPlayerId === undefined
        ? { kind: 'plate' }
        : { kind: 'seat', playerId: intent.payload.targetPlayerId };
    case 'sellCard':
      return { kind: 'sell' };
  }
}

export function sameHoveredZone(a: HoveredDropZone | null, b: HoveredDropZone | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.kind === 'seat' && b.kind === 'seat') {
    return a.playerId === b.playerId;
  }
  return a.kind === b.kind;
}

export interface SeatDropHighlight {
  readonly seatIds: readonly string[];
  readonly overId: string | null;
}
export type PlateDropHighlight = 'valid' | 'over';

/**
 * `zones` is the latest model's, `hover` the last pointer move's: a seat is `over` only while the
 * latest model still lists it, so a turn that passes under a resting pointer lights nothing.
 */
export function seatDropHighlight(zones: DropZones, hover: HoveredDropZone | null): SeatDropHighlight {
  const overId = hover?.kind === 'seat' && zones.seatIds.includes(hover.playerId) ? hover.playerId : null;
  return { seatIds: zones.seatIds, overId };
}

/** Null for a targeted card: only an untargeted one lights the plate. */
export function plateDropHighlight(zones: DropZones, hover: HoveredDropZone | null): PlateDropHighlight | null {
  if (zones.plate === null) {
    return null;
  }
  return hover?.kind === 'plate' ? 'over' : 'valid';
}

/**
 * Above the hand, on the side opposite the drag origin (§6.6.3), so neither a straight lift nor a
 * release over the hand sells.
 */
export function sellZoneRect(hand: Rect, originX: number, viewportWidth: number): Rect {
  const left =
    originX < viewportWidth / 2 ? viewportWidth - SELL_ZONE_SIZE.width - SELL_ZONE_INSET_PX : SELL_ZONE_INSET_PX;
  return {
    left,
    top: hand.top - SELL_ZONE_SIZE.height - SELL_ZONE_GAP_PX,
    width: SELL_ZONE_SIZE.width,
    height: SELL_ZONE_SIZE.height,
  };
}

/** A plain `Rect` from a `DOMRect` (or any box): the four fields only. */
export function rectOf(box: { left: number; top: number; width: number; height: number }): Rect {
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

/** Seats by `[data-zone="opponent-seat"][data-player-id]` (DOM order), plate by `[data-zone="pending"]`. */
export function measureDropZones(root: ParentNode, sell: Rect | null): DropZoneRects {
  const seats = [...root.querySelectorAll('[data-zone="opponent-seat"][data-player-id]')].flatMap((element) => {
    // `getAttribute`, not `dataset`: `dataset` is an index signature (noPropertyAccessFromIndexSignature).
    const playerId = element.getAttribute('data-player-id');
    return playerId === null || playerId === '' ? [] : [{ playerId, rect: rectOf(element.getBoundingClientRect()) }];
  });
  const plate = root.querySelector('[data-zone="pending"]');
  return { seats, plate: plate === null ? null : rectOf(plate.getBoundingClientRect()), sell };
}

/** What the hand fan wires on each card slot (`HandFan` `drag`). */
export interface HandFanDragProps {
  readonly onCardPointerDown: (source: HandCardSource, event: ReactPointerEvent<HTMLElement>) => void;
  /** Swallows the click that ends a drag, in the capture phase, so it never opens the sheet. */
  readonly onCardClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
  /** The dragged (or returning) card: its slot dims and carries `data-lifted`. */
  readonly liftedInstanceId: string | null;
}
