/**
 * Tutorial callouts — technical spec v7 §6.12 (the guide callout is orange, with its arrow outside
 * the highlight), §8.3 (static under reduced motion); Lot 75 plan Appendix A.8.6 (L75-04, K6).
 *
 * One measured layer rings every live `[data-tutorial-highlight]` element. It portals to
 * `document.body` on `Z_INDEX.hint`, so neither the hand `ScrollArea`, the `overflow-hidden` arena
 * region nor a sheet body can clip a callout (V2 needed `overflow: visible` on the card band). A
 * tutorial room never shows a first-game hint, so the layer shares `hint` with `HintOverlay`.
 *
 * - **Live layer only.** While a sheet is live (`liveSheetId`), only the targets inside that sheet's
 *   overlay draw; otherwise only the table's. A zero-size target, or one inside an `inert` subtree,
 *   is skipped.
 * - **Measured every frame while active.** Sheets and the fan move under motion, which no observer
 *   reports, so the layer re-measures on each `requestAnimationFrame` and sets state only when a
 *   target moved, appeared or went away.
 * - **Never in the way.** The root is `pointer-events: none` and `aria-hidden`; the element keeps
 *   its own name and the callout carries no `data-tutorial-highlight`.
 * - **Chrome.** A 3 px `--threat-other` ring 4 px outside the target (`calloutPlacement`) and a
 *   20×12 arrow outside the ring, pointing at it. Full motion pulses the ring's opacity; reduced
 *   motion keeps it static (`data-motion`).
 */

import { useLayoutEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '../layers';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { V7_COLORS } from '../palette';
import { motionAttribute } from '../primitives/chrome-classes';
import { liveSheetId } from '../primitives/sheet-stack';
import { useSheetStackStore } from '../primitives/sheet-stack-context';
import { useVisualViewportBox } from '../use-visual-viewport-box';
import { liveTutorialMarks } from './live-tutorial-marks';
import { calloutPlacement, type CalloutArrowSide, type CalloutRect } from './tutorial-callout-geometry';

export interface TutorialCalloutLayerProps {
  /** The tutorial is live (`useArenaTutorial(...).active`); inactive, the layer draws nothing. */
  readonly active: boolean;
}

interface CalloutTarget {
  readonly id: string;
  readonly rect: CalloutRect;
}

function sameTargets(a: readonly CalloutTarget[], b: readonly CalloutTarget[]): boolean {
  return (
    a.length === b.length &&
    a.every((target, index) => {
      const other = b[index];
      return (
        other?.id === target.id &&
        other.rect.left === target.rect.left &&
        other.rect.top === target.rect.top &&
        other.rect.width === target.rect.width &&
        other.rect.height === target.rect.height
      );
    })
  );
}

/** A 20×12 triangle pointing at the ring: down from above it (`top`), up from below it (`bottom`). */
function CalloutArrow({ side, rect }: { readonly side: CalloutArrowSide; readonly rect: CalloutRect }): ReactElement {
  const points = side === 'top' ? '1,1 19,1 10,11' : '1,11 19,11 10,1';
  return (
    <svg
      width={rect.width}
      height={rect.height}
      viewBox="0 0 20 12"
      className="absolute"
      style={{ left: rect.left, top: rect.top }}
    >
      <polygon points={points} fill={V7_COLORS['threat-other']} stroke={V7_COLORS.ink} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function TutorialCalloutLayer({ active }: TutorialCalloutLayerProps): ReactElement | null {
  const box = useVisualViewportBox();
  const store = useSheetStackStore();
  const reduced = usePrefersReducedMotion();
  const [targets, setTargets] = useState<readonly CalloutTarget[]>([]);

  const { offsetLeft, offsetTop } = box;
  useLayoutEffect(() => {
    if (!active) return;
    const measure = (): void => {
      const next: CalloutTarget[] = liveTutorialMarks(liveSheetId(store.getSnapshot())).map(({ id, rect }) => ({
        id,
        rect: { left: rect.left - offsetLeft, top: rect.top - offsetTop, width: rect.width, height: rect.height },
      }));
      setTargets((current) => (sameTargets(current, next) ? current : next));
    };
    measure();
    let frame = 0;
    const tick = (): void => {
      measure();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [active, store, offsetLeft, offsetTop]);

  if (!active || targets.length === 0) return null;
  const motion = motionAttribute(reduced);
  return createPortal(
    <div
      data-zone="tutorial-callouts"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: box.offsetTop,
        left: box.offsetLeft,
        width: box.width,
        height: box.height,
        zIndex: Z_INDEX.hint,
        pointerEvents: 'none',
      }}
    >
      {targets.map((target, index) => {
        const placed = calloutPlacement(target.rect, box);
        return (
          // Ids repeat (the three `your-zone` regions, every `opponent` seat): the order is the DOM's.
          <div key={`${target.id}:${String(index)}`} data-tutorial-callout={target.id} data-callout-arrow={placed.side} data-motion={motion}>
            <div
              className={`absolute rounded-v7-chrome-sm ring-3 ring-v7-threat-other${reduced ? '' : ' animate-pulse'}`}
              style={{ left: placed.ring.left, top: placed.ring.top, width: placed.ring.width, height: placed.ring.height }}
            />
            <CalloutArrow side={placed.side} rect={placed.arrow} />
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
