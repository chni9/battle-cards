/**
 * The hand drag gesture — technical spec v7 §6.6.3 (drag is a shortcut: seats, the plate, the
 * Sell zone), §6.6.4 (an intent leaves only on a drop on a valid zone), §6.6.5 (lift past ~8 px,
 * a ghost out of the scroller, spring-back); Lot 74 plan Appendix A.7; decisions.md 2026-10-28
 * "V7 hand drag" (L74-12).
 *
 * Pointer events with a threshold, not motion's element `drag`: the card slots keep
 * `touch-action: pan-x`, so a horizontal swipe stays the browser's native scroll of the hand,
 * and a move more vertical than horizontal past `HAND_DRAG_LIFT_PX` lifts a ghost. A press never
 * calls `preventDefault`, so a tap still clicks and opens the sheet; the click that ends a drag
 * is swallowed in the capture phase. The zones are measured once, at lift; the highlights and
 * the drop read the card's model on the latest view each time. Ghost moves set motion values
 * and never re-render the arena: only a change of the hovered zone does. A keyboard click is never
 * swallowed, and a release while a sheet is live springs back and sends nothing.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { animate, useMotionValue, type MotionValue } from 'motion/react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { CARD_SPRING } from '../../ui/motion/motion-tokens';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { liveSheetId } from '../../ui/primitives/sheet-stack';
import { useSheetStackStore } from '../../ui/primitives/sheet-stack-context';
import { readVisualViewportBox } from '../../ui/visual-viewport';
import type { ActionContext } from '../../view-model/action-lock';
import { cardActions, type DropZones } from '../../view-model/card-actions';
import type { DropZoneRects, Point, Rect } from '../../view-model/drop-target';
import type { ArenaCommit } from './arena-commit';
import { liveCardRefFor } from './card-sheet-source';
import {
  canStartHandDrag,
  classifyHandGesture,
  dispatchDrop,
  hoveredZoneOf,
  latestHeldActions,
  measureDropZones,
  rectOf,
  resolveDrop,
  sameHoveredZone,
  sellZoneRect,
  type HandFanDragProps,
  type HoveredDropZone,
} from './hand-drag';
import type { HandCardSource } from './hand-fan-model';

export interface HandDragInput {
  view: PlayingStateView;
  ctx: ActionContext;
  targetingActive: boolean;
  commit: ArenaCommit;
  /** Opens this card's sheet: its pre-send choice step (§6.6.3). */
  openChoice: (source: HandCardSource) => void;
}

export interface HandDragView {
  /** The dragged hand or special card. */
  readonly card: HandCardSource;
  readonly phase: 'dragging' | 'returning';
  /** The latest model's zones; empty once the card left the hand. */
  readonly zones: DropZones;
  readonly hover: HoveredDropZone | null;
  /** The measured Sell zone, or null when the card was not sellable at lift (and while returning). */
  readonly sellRect: Rect | null;
  readonly ghostX: MotionValue<number>;
  readonly ghostY: MotionValue<number>;
}

type Phase =
  | { kind: 'pressed'; card: HandCardSource; pointerId: number; start: Point; origin: Rect }
  | {
      kind: 'dragging';
      card: HandCardSource;
      pointerId: number;
      origin: Rect;
      /** The pointer's offset inside the card at the press, kept by the ghost. */
      grab: Point;
      rects: DropZoneRects;
      hover: HoveredDropZone | null;
    }
  | { kind: 'returning'; card: HandCardSource; origin: Rect };

const EMPTY_RECT: Rect = { left: 0, top: 0, width: 0, height: 0 };

function pointOf(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

export function useHandDrag(input: HandDragInput): {
  readonly fanProps: HandFanDragProps;
  readonly view: HandDragView | null;
} {
  const reduced = usePrefersReducedMotion();
  const store = useSheetStackStore();
  const [phase, setPhase] = useState<Phase | null>(null);
  // Set at lift, cleared by the next press: the click that ends a drag never opens the sheet.
  const suppressClick = useRef(false);
  const ghostX = useMotionValue(0);
  const ghostY = useMotionValue(0);

  /** Back to the slot with `CARD_SPRING`, at once under reduced motion. Nothing is sent. */
  function springBack(card: HandCardSource, origin: Rect): void {
    if (reduced) {
      setPhase(null);
      return;
    }
    const returning: Phase = { kind: 'returning', card, origin };
    setPhase(returning);
    animate(ghostX, origin.left, CARD_SPRING);
    animate(ghostY, origin.top, {
      ...CARD_SPRING,
      onComplete: () => {
        // A new press may have replaced the return already: only this return ends here.
        setPhase((current) => (current === returning ? null : current));
      },
    });
  }

  const onPointerMove = useEffectEvent((event: PointerEvent): void => {
    const point = pointOf(event);
    if (phase?.kind === 'pressed') {
      const gesture = classifyHandGesture({ x: point.x - phase.start.x, y: point.y - phase.start.y });
      if (gesture === 'pending') {
        return;
      }
      if (gesture === 'scroll') {
        // The browser owns a horizontal pan (`touch-action: pan-x`); the press is over.
        setPhase(null);
        return;
      }
      const grab = { x: phase.start.x - phase.origin.left, y: phase.start.y - phase.origin.top };
      const handRegion = document.querySelector('[data-arena-region="hand"]');
      const hand = handRegion === null ? EMPTY_RECT : rectOf(handRegion.getBoundingClientRect());
      const latest = latestHeldActions(input.view, input.ctx, phase.card);
      const sell = latest?.drop.sell === true ? sellZoneRect(hand, phase.start.x, readVisualViewportBox().width) : null;
      const rects = measureDropZones(document, sell);
      // `jump` also stops a spring-back still running from the previous drag.
      ghostX.jump(point.x - grab.x);
      ghostY.jump(point.y - grab.y);
      suppressClick.current = true;
      setPhase({
        kind: 'dragging',
        card: phase.card,
        pointerId: phase.pointerId,
        origin: phase.origin,
        grab,
        rects,
        hover: hoveredZoneOf(resolveDrop(point, rects, latest)),
      });
      return;
    }
    if (phase?.kind === 'dragging') {
      ghostX.set(point.x - phase.grab.x);
      ghostY.set(point.y - phase.grab.y);
      const hover = hoveredZoneOf(resolveDrop(point, phase.rects, latestHeldActions(input.view, input.ctx, phase.card)));
      if (!sameHoveredZone(hover, phase.hover)) {
        setPhase({ ...phase, hover });
      }
    }
  });

  const onPointerUp = useEffectEvent((event: PointerEvent): void => {
    if (phase?.kind === 'pressed') {
      // A tap: the click that follows opens the sheet as usual.
      setPhase(null);
      return;
    }
    if (phase?.kind !== 'dragging') {
      return;
    }
    // A sheet opened mid-drag (a second finger on a seat or the plate) is modal: the card springs
    // back and nothing is sent under it (final review, Minor 5).
    if (liveSheetId(store.getSnapshot()) !== null) {
      springBack(phase.card, phase.origin);
      return;
    }
    const latest = latestHeldActions(input.view, input.ctx, phase.card);
    const point = pointOf(event);
    // The context names the card and the release point, so its ghost flies from there (L74-17).
    const outcome = dispatchDrop(
      resolveDrop(point, phase.rects, latest),
      input.commit,
      () => {
        input.openChoice(phase.card);
      },
      { instanceId: phase.card.instance.instanceId, dropPoint: point },
    );
    if (outcome === 'returned') {
      springBack(phase.card, phase.origin);
    } else {
      // A sent drop or an opened choice drops the ghost at once; the sent card's flight leaves from the
      // release point through the commit's own-intent FX (L74-17), L78 restyles it.
      setPhase(null);
    }
  });

  const onPointerCancel = useEffectEvent((): void => {
    if (phase?.kind === 'pressed') {
      setPhase(null);
    } else if (phase?.kind === 'dragging') {
      springBack(phase.card, phase.origin);
    }
  });

  const trackedPointerId = phase?.kind === 'pressed' || phase?.kind === 'dragging' ? phase.pointerId : null;
  useEffect(() => {
    if (trackedPointerId === null) return;
    const onMove = (event: PointerEvent): void => {
      if (event.pointerId === trackedPointerId) onPointerMove(event);
    };
    const onUp = (event: PointerEvent): void => {
      if (event.pointerId === trackedPointerId) onPointerUp(event);
    };
    const onCancel = (event: PointerEvent): void => {
      if (event.pointerId === trackedPointerId) onPointerCancel();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [trackedPointerId]);

  const fanProps: HandFanDragProps = {
    onCardPointerDown: (source, event) => {
      suppressClick.current = false;
      if (!event.isPrimary || event.button !== 0) return;
      const actions = cardActions(input.view, liveCardRefFor(source, input.view), input.ctx);
      if (!canStartHandDrag(actions, input.targetingActive)) return;
      // Never `preventDefault`: a press that does not lift is a tap, and the tap still clicks.
      setPhase({
        kind: 'pressed',
        card: source,
        pointerId: event.pointerId,
        start: { x: event.clientX, y: event.clientY },
        origin: rectOf(event.currentTarget.getBoundingClientRect()),
      });
    },
    onCardClickCapture: (event) => {
      // A keyboard or AT click (`detail` 0) never ends a drag. After a drag that ended off the card
      // no click followed and the flag is still set, so the next Enter would be swallowed; it
      // opens the sheet and clears the flag instead (final review, Minor 2).
      if (event.detail === 0) {
        suppressClick.current = false;
        return;
      }
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    liftedInstanceId: phase === null || phase.kind === 'pressed' ? null : phase.card.instance.instanceId,
  };

  const view: HandDragView | null =
    phase === null || phase.kind === 'pressed'
      ? null
      : {
          card: phase.card,
          phase: phase.kind,
          // Recomputed every render: a card that left the hand, or a passed turn, lights nothing.
          zones: latestHeldActions(input.view, input.ctx, phase.card)?.drop ?? { seatIds: [], plate: null, sell: false },
          hover: phase.kind === 'dragging' ? phase.hover : null,
          sellRect: phase.kind === 'dragging' ? phase.rects.sell : null,
          ghostX,
          ghostY,
        };

  return { fanProps, view };
}
