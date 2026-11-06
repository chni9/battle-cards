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
 * - **Slot (K8, S4).** The panel sits at the `[data-arena-region="arena"]` region's top-left, 8 px in,
 *   `min(22rem, 100% - 1rem)` wide, in every mode. The host measures that region itself (a
 *   `ResizeObserver`, the `use-arena-layout-box.ts` pattern), so a mode change only moves the panel.
 *   While a live `[data-tutorial-highlight]` element (or its ring and arrow), or a valid target seat
 *   while the player is targeting, overlaps that corner, the
 *   panel flips to the arena region's bottom edge (`placeCoach`, designer 2026-11-06, Check 2 stop item
 *   S4): at 375×812 the corner covered the opponent seat and the Incoming plate. When the bottom edge
 *   overlaps the marks too, it takes a third slot under the opponent row (the box around the measured
 *   `[data-zone="opponent-seat"]` elements; designer 2026-11-06, Q2-5). During the board tour and the Look gate only
 *   (`coach.locksTable`), the slots are the visible viewport's top and bottom edges and
 *   the one under the opponents, the least-covering winning (designer 2026-11-06, Gate B stop item
 *   S-B1), the top one starting under the top bar on desktop (Gate C, S-C2); script steps keep the arena-only
 *   slots so the hand and dock stay usable. The marks are read
 *   with the callout layer's own reader (`liveTutorialMarks`: live sheet layer, not inert, not empty), on each frame, because
 *   sheets and the fan move without notice.
 * - **Focus.** The slot's mousedown is prevented, so × and Got it never move focus out of an open
 *   sheet. From the keyboard, × first hands focus to the top bar's Menu (where Show coach lives), and
 *   Got it hands it to the next step's Got it (else its ×). Only a Got it pressed with focus inside
 *   the slot arms that hand-off, so new copy that Got it did not cause never steals focus.
 */

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { CoachPanel } from '../../ui/coach/coach-panel';
import { liveTutorialMarks, type LiveTutorialMark } from '../../ui/coach/live-tutorial-marks';
import { Z_INDEX } from '../../ui/layers';
import { Button } from '../../ui/primitives/button';
import { liveSheetId } from '../../ui/primitives/sheet-stack';
import { useSheetStackStore } from '../../ui/primitives/sheet-stack-context';
import { useViewportMode, useVisualViewportBox } from '../../ui/use-visual-viewport-box';
import type { Rect } from '../../view-model/drop-target';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { COACH_INSET_PX, placeCoach } from './coach-placement';
import { MENU_LABEL } from './top-bar-model';
import type { ArenaCoachView } from './use-arena-tutorial';

export interface TutorialCoachHostProps {
  /** Mounted only while `tutorial.coach !== null && tutorial.coach.open`. */
  coach: ArenaCoachView;
  onHide: () => void;
  /** The footer is shown only when `coach.showAck`. */
  onAck: () => void;
}

interface SlotPosition {
  readonly top: number;
  readonly left: number;
}

/** A seat the targeting step accepts (`opponent-seat.tsx`, L74-10). */
const VALID_TARGET_SEAT_SELECTOR = '[data-target-seat="valid"]';

const UNMEASURED_SLOT: SlotPosition = { top: COACH_INSET_PX, left: COACH_INSET_PX };

const OPPONENT_SEAT_SELECTOR = '[data-zone="opponent-seat"]';

/** The box around every opponent seat, or `undefined` while none is mounted (`placeCoach`'s third slot). */
function opponentRowRect(arena: Element): Rect | undefined {
  const rects = Array.from(arena.querySelectorAll(OPPONENT_SEAT_SELECTOR), (seat) => seat.getBoundingClientRect()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  if (rects.length === 0) return undefined;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  return {
    left,
    top,
    width: Math.max(...rects.map((rect) => rect.right)) - left,
    height: Math.max(...rects.map((rect) => rect.bottom)) - top,
  };
}

const toRect = (rect: DOMRect): Rect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });

export function TutorialCoachHost({ coach, onHide, onAck }: TutorialCoachHostProps): ReactElement {
  const box = useVisualViewportBox();
  const onDesktop = useViewportMode() === 'desktop';
  const slotRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<SlotPosition>(UNMEASURED_SLOT);
  // Armed only by a Got it pressed with focus inside the slot (the keyboard), cleared on use.
  const refocus = useRef(false);

  const store = useSheetStackStore();
  useLayoutEffect(() => {
    const arena = document.querySelector('[data-arena-region="arena"]');
    if (arena === null) return;
    // The tour and Look marks, and while the player is targeting, the seats they may pick: the script marks
    // the hand card then, so nothing in the arena would stop the coach covering the only valid target.
    const liveMarks = (): readonly LiveTutorialMark[] => {
      const live = liveSheetId(store.getSnapshot());
      return [...liveTutorialMarks(live), ...liveTutorialMarks(live, VALID_TARGET_SEAT_SELECTOR)];
    };
    const measure = (): void => {
      const slotElement = slotRef.current;
      if (slotElement === null) return;
      const rect = toRect(arena.getBoundingClientRect());
      const size = slotElement.getBoundingClientRect();
      const row = opponentRowRect(arena);
      const shared = {
        coach: { width: size.width, height: size.height },
        // In the host's coordinates, which start at the visual viewport's offset.
        arena: { ...rect, left: rect.left - box.offsetLeft, top: rect.top - box.offsetTop },
        marks: liveMarks().map(({ rect: mark }) => ({
          ...mark,
          left: mark.left - box.offsetLeft,
          top: mark.top - box.offsetTop,
        })),
        ...(row !== undefined ? { opponents: { ...row, left: row.left - box.offsetLeft, top: row.top - box.offsetTop } } : {}),
      };
      // On desktop the top slot starts under the top bar (Gate C, S-C2), so the coach never hides the turn strip.
      const topBar = onDesktop ? document.querySelector('[data-arena-region="top-bar"]')?.getBoundingClientRect() : undefined;
      // The tour and the Look gate lock the table, so their coach may sit over the self strip and the hand (S-B1); a script step keeps the arena.
      const placed = placeCoach(
        coach.locksTable
          ? {
              ...shared,
              bounds: 'viewport',
              viewport: { left: 0, top: 0, width: box.width, height: box.height },
              ...(topBar !== undefined ? { topBar: { ...toRect(topBar), left: topBar.left - box.offsetLeft, top: topBar.top - box.offsetTop } } : {}),
            }
          : shared,
      );
      setSlot((previous) => (previous.top === placed.top && previous.left === placed.left ? previous : { top: placed.top, left: placed.left }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    // The marks move with sheets and the fan, which no observer reports: re-measure each frame, as the callout layer does.
    let frame = 0;
    const tick = (): void => {
      measure();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [box.offsetTop, box.offsetLeft, box.width, box.height, store, coach.messageKey, coach.locksTable, onDesktop]);

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
