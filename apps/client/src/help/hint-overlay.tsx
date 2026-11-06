/**
 * Hovering first-game hint — technical spec v7 §6.12 (a compact translucent panel next to
 * `data-hint-anchor`), §4.2 (rebuilt on `ui/`); technical spec v6 §5.2 / L46-02; Lot 75 plan A.9.3.
 * Not a Dialog. Anchored next to `data-hint-anchor`; no rings. × dismisses like Got it.
 *
 * Portaled on `Z_INDEX.hint` (L75-06): a `position: fixed` layer sized to the visual viewport, so a
 * pinch-zoomed card cannot leave the screen. The layer is pointer-transparent and only the card takes
 * presses. It re-places on a resize of its anchor, of the arena region or of the viewport.
 */

import { useLayoutEffect, useRef, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { CoachPanel } from '../ui/coach/coach-panel';
import { hintAnchorId, hintPlacePrefer, type HintId } from '../ui/hint-ids';
import { Z_INDEX } from '../ui/layers';
import { Button } from '../ui/primitives/button';
import { useViewportMode, useVisualViewportBox } from '../ui/use-visual-viewport-box';
import { readVisualViewportBox } from '../ui/visual-viewport';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../view-model/table-copy';

import { HINT_COPY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import { placeHintCard } from './place-hint-card';

export interface HintOverlayProps {
  hintId: HintId;
  /** Hide while a table Dialog is open (Shop, inspect, leave, How to play). */
  dialogOpen: boolean;
  onGotIt: () => void;
  onSkipAll: () => void;
  /** L75-07: replaces HINT_COPY[hintId].body (the per-card incoming-thief copy). */
  body?: string;
}

/** The first anchor with a laid-out box: a twin mounted at zero size never takes the card (`help/` imports no `fx/`, K2). */
function firstVisibleAnchor(selector: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

export function HintOverlay({ hintId, dialogOpen, onGotIt, onSkipAll, body }: HintOverlayProps): ReactElement | null {
  const slotRef = useRef<HTMLDivElement>(null);
  const box = useVisualViewportBox();
  const mode = useViewportMode();
  const copy = HINT_COPY[hintId];

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (slot === null || dialogOpen) return;
    const selector = `[data-hint-anchor="${hintAnchorId(hintId)}"]`;

    const place = (): void => {
      const node = firstVisibleAnchor(selector);
      if (node === null) {
        slot.style.top = '';
        slot.style.left = '0.5rem';
        slot.style.bottom = '7.5rem';
        return;
      }
      const anchor = node.getBoundingClientRect();
      const vv = readVisualViewportBox();
      const placed = placeHintCard(
        { top: anchor.top - vv.offsetTop, left: anchor.left - vv.offsetLeft, width: anchor.width, height: anchor.height },
        { width: slot.offsetWidth, height: slot.offsetHeight },
        { width: vv.width, height: vv.height },
        { prefer: hintPlacePrefer(hintId) },
      );
      slot.style.top = `${String(placed.top)}px`;
      slot.style.left = `${String(placed.left)}px`;
      slot.style.bottom = 'auto';
    };

    place();
    const node = firstVisibleAnchor(selector);
    const observer = new ResizeObserver(place);
    if (node !== null) observer.observe(node);
    // An anchor can move without resizing (a band flip, a strip re-wrap): the arena region, which holds
    // the seats and the plate, reports it (Lot 75 final review M4).
    const arena = document.querySelector('[data-arena-region="arena"]');
    if (arena !== null) observer.observe(arena);
    window.addEventListener('resize', place);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      vv?.removeEventListener('resize', place);
    };
  }, [hintId, dialogOpen, mode, body]);

  if (dialogOpen) return null;

  return createPortal(
    <div
      data-hint-layer=""
      className="pointer-events-none fixed"
      style={{ zIndex: Z_INDEX.hint, top: box.offsetTop, left: box.offsetLeft, width: box.width, height: box.height }}
    >
      <div
        ref={slotRef}
        data-hint-slot=""
        className={`pointer-events-auto absolute ${
          mode === 'landscape-compact' ? 'w-[min(22rem,calc(100vw-1rem))]' : 'w-[min(15.5rem,calc(100vw-1rem))]'
        }`}
        style={{ bottom: '7.5rem', left: '0.5rem' }}
      >
        <CoachPanel
          key={hintId}
          compact
          title={copy.title}
          body={body ?? copy.body}
          zone="first-game-hint"
          extraAttrs={{ 'data-hint-id': hintId }}
          onHide={onGotIt}
          hideAriaLabel={HIDE_COACH_ARIA_LABEL}
          footer={
            <>
              <Button variant="primary" className="flex-1" data-hint-ack="got-it" onClick={onGotIt}>
                {GOT_IT_ACTION_LABEL}
              </Button>
              <Button variant="quiet" className="flex-1" data-hint-ack="skip-all" onClick={onSkipAll}>
                {SKIP_ALL_HINTS_LABEL}
              </Button>
            </>
          }
        />
      </div>
    </div>,
    document.body,
  );
}
