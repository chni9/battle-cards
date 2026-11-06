/**
 * The tutorial coach on the arena — technical spec v7 §6.12 (the coach keeps its behavior,
 * restyled), §6.1 (no floating reopen control: Menu → Show coach), §14.3; Lot 75 plan Appendix
 * A.8.1, A.8.3 (L75-04; R7, K8); Review Focus 3.
 *
 * - **Layer.** The `ui/coach` `CoachPanel` portals to `document.body` in a `pointer-events: none` box
 *   on the visible viewport, on `Z_INDEX.coach`: above every sheet and Minimize bar, under banners and
 *   toasts. It sits outside every sheet, so no sheet makes it inert and a press on it never reaches a
 *   backdrop. The panel stays non-modal (no role, no focus taken), so a sheet's focus trap keeps Tab
 *   and Esc.
 * - **Slot (K8).** The panel sits at the `[data-arena-region="arena"]` region's top-left, 8 px in,
 *   `min(22rem, 100% - 1rem)` wide, in every mode. The host measures that region itself (a
 *   `ResizeObserver`, the `use-arena-layout-box.ts` pattern), so a mode change only moves the panel.
 * - **Focus.** The slot's mousedown is prevented, so × and Got it never move focus out of an open
 *   sheet. From the keyboard, × first hands focus to the top bar's Menu (where Show coach lives), and
 *   Got it hands it to the next step's Got it (else its ×). Only a Got it pressed with focus inside
 *   the slot arms that hand-off, so new copy that Got it did not cause never steals focus.
 */

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { CoachPanel } from '../../ui/coach/coach-panel';
import { Z_INDEX } from '../../ui/layers';
import { Button } from '../../ui/primitives/button';
import { useVisualViewportBox } from '../../ui/use-visual-viewport-box';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { MENU_LABEL } from './top-bar-model';
import type { ArenaCoachView } from './use-arena-tutorial';

export interface TutorialCoachHostProps {
  /** Mounted only while `tutorial.coach !== null && tutorial.coach.open`. */
  coach: ArenaCoachView;
  onHide: () => void;
  /** The footer is shown only when `coach.showAck`. */
  onAck: () => void;
}

/** The panel's inset from the arena region's top-left corner. */
const COACH_INSET_PX = 8;

interface SlotPosition {
  readonly top: number;
  readonly left: number;
}

const UNMEASURED_SLOT: SlotPosition = { top: COACH_INSET_PX, left: COACH_INSET_PX };

export function TutorialCoachHost({ coach, onHide, onAck }: TutorialCoachHostProps): ReactElement {
  const box = useVisualViewportBox();
  const slotRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<SlotPosition>(UNMEASURED_SLOT);
  // Armed only by a Got it pressed with focus inside the slot (the keyboard), cleared on use.
  const refocus = useRef(false);

  useLayoutEffect(() => {
    const arena = document.querySelector('[data-arena-region="arena"]');
    if (arena === null) return;
    const measure = (): void => {
      const rect = arena.getBoundingClientRect();
      const top = rect.top - box.offsetTop + COACH_INSET_PX;
      const left = rect.left - box.offsetLeft + COACH_INSET_PX;
      setSlot((previous) => (previous.top === top && previous.left === left ? previous : { top, left }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    return () => {
      observer.disconnect();
    };
  }, [box.offsetTop, box.offsetLeft, box.width, box.height]);

  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const next =
      slotRef.current?.querySelector<HTMLElement>('[data-tutorial-ack="got-it"]') ??
      slotRef.current?.querySelector<HTMLElement>(`button[aria-label="${HIDE_COACH_ARIA_LABEL}"]`) ??
      null;
    next?.focus();
  }, [coach.messageKey]);

  const focusInSlot = (): boolean => slotRef.current?.contains(document.activeElement) === true;

  const hide = (): void => {
    if (focusInSlot()) {
      document.querySelector<HTMLElement>(`[data-arena-region="top-bar"] button[aria-label="${MENU_LABEL}"]`)?.focus();
    }
    onHide();
  };

  const ack = (): void => {
    refocus.current = focusInSlot();
    onAck();
  };

  return createPortal(
    <div
      data-tutorial-coach-host=""
      style={{
        position: 'fixed',
        top: box.offsetTop,
        left: box.offsetLeft,
        width: box.width,
        height: box.height,
        zIndex: Z_INDEX.coach,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={slotRef}
        data-tutorial-coach-slot=""
        className="absolute w-[min(22rem,calc(100%-1rem))]"
        // Inline, as the host's `none` is: only the panel takes presses.
        style={{ top: slot.top, left: slot.left, pointerEvents: 'auto' }}
        onMouseDown={(event) => {
          // A press never moves focus out of an open sheet (Review Focus 3).
          event.preventDefault();
        }}
      >
        <CoachPanel
          key={coach.messageKey}
          title={coach.title}
          body={coach.body}
          zone="tutorial-coach"
          hideAriaLabel={HIDE_COACH_ARIA_LABEL}
          onHide={hide}
          extraAttrs={{ 'data-tutorial-index': String(coach.index), 'data-tutorial-coach-open': 'true' }}
          {...(coach.showAck
            ? {
                footer: (
                  <Button variant="primary" fullWidth data-tutorial-ack="got-it" onClick={ack}>
                    {GOT_IT_ACTION_LABEL}
                  </Button>
                ),
              }
            : {})}
        />
      </div>
    </div>,
    document.body,
  );
}
