/**
 * Hovering first-game hint — technical spec v6 §5.2 / L46-02.
 * Not a Dialog. Anchored next to `data-hint-anchor`; no rings.
 * Compact + transparent so the table stays readable. × dismisses like Got it.
 */

import { useLayoutEffect, useRef, type CSSProperties, type ReactElement } from 'react';

import { CoachPanel } from '../design/components/coach-panel';
import { Button } from '../design/components/button';
import {
  GOT_IT_ACTION_LABEL,
  HIDE_COACH_ARIA_LABEL,
} from '../screens/table/table-copy';

import { HINT_COPY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import { hintAnchorId, type HintId } from './hint-ids';
import { placeHintCard } from './place-hint-card';

const COMPACT_HINT_BUTTON =
  '!min-h-8 !min-w-0 flex-1 px-2 py-1 text-xs font-semibold';

export interface HintOverlayProps {
  hintId: HintId;
  /** Hide while a table Dialog is open (Shop, inspect, leave, How to play). */
  dialogOpen: boolean;
  onGotIt: () => void;
  onSkipAll: () => void;
}

export function HintOverlay({
  hintId,
  dialogOpen,
  onGotIt,
  onSkipAll,
}: HintOverlayProps): ReactElement | null {
  const cardRef = useRef<HTMLDivElement>(null);
  const copy = HINT_COPY[hintId];

  useLayoutEffect(() => {
    const slot = cardRef.current;
    if (slot === null || dialogOpen) {
      return;
    }
    const node = document.querySelector(
      `[data-hint-anchor="${hintAnchorId(hintId)}"]`,
    );
    if (!(node instanceof HTMLElement)) {
      slot.style.top = '';
      slot.style.left = '0.5rem';
      slot.style.bottom = '7.5rem';
      return;
    }
    const anchor = node.getBoundingClientRect();
    const placed = placeHintCard(
      {
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
        height: anchor.height,
      },
      { width: slot.offsetWidth, height: slot.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    slot.style.top = `${String(placed.top)}px`;
    slot.style.left = `${String(placed.left)}px`;
    slot.style.bottom = 'auto';
  }, [hintId, dialogOpen]);

  if (dialogOpen) {
    return null;
  }

  const slotStyle: CSSProperties = { bottom: '7.5rem', left: '0.5rem' };

  return (
    <div className="pointer-events-none fixed inset-0 z-[105]">
      <div
        ref={cardRef}
        className="pointer-events-auto absolute w-[min(15.5rem,calc(100vw-1rem))]"
        style={slotStyle}
      >
        <CoachPanel
          key={hintId}
          compact
          title={copy.title}
          body={copy.body}
          zone="first-game-hint"
          extraAttrs={{ 'data-hint-id': hintId }}
          onHide={onGotIt}
          hideAriaLabel={HIDE_COACH_ARIA_LABEL}
          footer={
            <>
              <Button
                variant="green"
                className={COMPACT_HINT_BUTTON}
                data-hint-ack="got-it"
                onClick={onGotIt}
              >
                {GOT_IT_ACTION_LABEL}
              </Button>
              <Button
                variant="orange"
                className={COMPACT_HINT_BUTTON}
                data-hint-ack="skip-all"
                onClick={onSkipAll}
              >
                {SKIP_ALL_HINTS_LABEL}
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
}
