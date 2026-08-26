/**
 * Hovering first-game hint — technical spec v6 §5.2 / L46-02.
 * Not a Dialog. Anchored next to `data-hint-anchor`; no rings.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

import { CoachPanel } from '../design/components/coach-panel';
import { Button } from '../design/components/button';
import { IconButton } from '../design/components/icon-button';
import {
  GOT_IT_ACTION_LABEL,
  HIDE_COACH_ARIA_LABEL,
  OPEN_COACH_ARIA_LABEL,
} from '../screens/table/table-copy';

import { HINT_COPY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import type { HintId } from './hint-ids';
import { placeHintCard } from './place-hint-card';

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
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const copy = HINT_COPY[hintId];
  const open = hiddenKey !== hintId;

  useLayoutEffect(() => {
    const slot = cardRef.current;
    if (slot === null || dialogOpen || !open) {
      return;
    }
    const node = document.querySelector(`[data-hint-anchor="${hintId}"]`);
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
  }, [hintId, dialogOpen, open]);

  if (dialogOpen) {
    return null;
  }

  const slotStyle: CSSProperties = { bottom: '7.5rem', left: '0.5rem' };

  return (
    <div className="pointer-events-none fixed inset-0 z-[105]">
      <div
        ref={cardRef}
        className="pointer-events-auto absolute w-[min(22rem,calc(100vw-1rem))]"
        style={slotStyle}
      >
        {open ? (
          <CoachPanel
            key={hintId}
            title={copy.title}
            body={copy.body}
            zone="first-game-hint"
            extraAttrs={{ 'data-hint-id': hintId }}
            onHide={() => {
              setHiddenKey(hintId);
            }}
            hideAriaLabel={HIDE_COACH_ARIA_LABEL}
            footer={
              <>
                <Button
                  variant="green"
                  className="w-full"
                  data-hint-ack="got-it"
                  onClick={onGotIt}
                >
                  {GOT_IT_ACTION_LABEL}
                </Button>
                <Button
                  variant="orange"
                  className="w-full"
                  data-hint-ack="skip-all"
                  onClick={onSkipAll}
                >
                  {SKIP_ALL_HINTS_LABEL}
                </Button>
              </>
            }
          />
        ) : (
          <IconButton
            data-zone="first-game-hint-toggle"
            aria-label={OPEN_COACH_ARIA_LABEL}
            className="border-2 border-cta-orange bg-cta-orange/20 text-lg font-bold shadow-[0_8px_24px_rgba(28,26,31,0.28)]"
            onClick={() => {
              setHiddenKey(null);
            }}
          >
            ?
          </IconButton>
        )}
      </div>
    </div>
  );
}
