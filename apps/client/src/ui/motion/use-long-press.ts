/**
 * Long-press — technical spec v7 §6.6.5: a face outside the hand opens its read-only sheet on a
 * press held for about 450 ms, cancelled by more than 8 px of movement. It applies outside the
 * hand only (the hand reads a vertical move as a drag), and it never sends an intent: the sheet
 * it opens is the same one Enter or a click opens on the face.
 *
 * The press is cancelled only by movement *more than* `LONG_PRESS_MOVE_PX` (spec v7 §6.6.5, "> 8
 * px"), so 8 px of travel keeps it and 9 px cancels it. Release, pointer cancel and leaving the
 * element cancel it too. `onClickCapture` swallows the click that ends a long press, so a tap
 * action on the same face (a shop tile selecting) does not also run. Motion preference does not
 * change any of this.
 */

import { useEffect, useLayoutEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

export const LONG_PRESS_MS = 450;
export const LONG_PRESS_MOVE_PX = 8;

export interface UseLongPressOptions {
  onLongPress: () => void;
  disabled?: boolean;
}

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  /** Swallows the click that ends a long press, so a tap action never follows it. */
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export function useLongPress({ onLongPress, disabled = false }: UseLongPressOptions): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<Point | null>(null);
  const fired = useRef(false);
  const latest = useRef(onLongPress);

  useLayoutEffect(() => {
    latest.current = onLongPress;
  });

  const cancel = (): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  };

  useEffect(() => {
    const pending = timer;
    return () => {
      if (pending.current !== null) {
        clearTimeout(pending.current);
        pending.current = null;
      }
    };
  }, []);

  return {
    onPointerDown: (event) => {
      fired.current = false;
      cancel();
      if (disabled || event.button !== 0) {
        return;
      }
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        start.current = null;
        fired.current = true;
        latest.current();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event) => {
      const origin = start.current;
      if (origin !== null && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_MOVE_PX) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (event) => {
      if (fired.current) {
        fired.current = false;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
