/**
 * The arena's layout box — technical spec v7 §6.4: the visible viewport picks the layout mode
 * (`useVisualViewportBox`, L53-07: never `100dvh`) and the arena region's own box sizes the seat
 * geometry. L74-04.
 *
 * The region is measured with `getBoundingClientRect` once on mount and again whenever its
 * `ResizeObserver` fires. State only changes when a dimension changes, so a resize that keeps the
 * size does not re-render. Before the first measure the arena is 0×0, which `layoutSeats` lays
 * out as a grid.
 */

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';

import { useVisualViewportBox } from '../../ui/use-visual-viewport-box';
import type { LayoutBox, Size } from '../../view-model/seat-layout';

const UNMEASURED: Size = { width: 0, height: 0 };

/** The visible viewport (it picks the mode) and the arena region's own box (it sizes the seats), spec v7 §6.4. 0×0 until the region is measured. */
export function useArenaLayoutBox(ref: RefObject<HTMLElement | null>): LayoutBox {
  const box = useVisualViewportBox();
  const [arena, setArena] = useState<Size>(UNMEASURED);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const measure = (): void => {
      const { width, height } = element.getBoundingClientRect();
      setArena((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return useMemo(
    () => ({ viewport: { width: box.width, height: box.height }, arena }),
    [box.width, box.height, arena],
  );
}
