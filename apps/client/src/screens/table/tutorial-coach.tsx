/**
 * Hovering tutorial coach chat — technical spec v6 §5.4.
 * Not a Dialog: the table stays clickable. Dismissible; reopens on new copy.
 * Skip stays on the table flag only. Tour steps add Got it; Look does not.
 */

import type { ReactElement } from 'react';

import { CoachPanel } from '../../design/components/coach-panel';
import { Button } from '../../design/components/button';
import { IconButton } from '../../design/components/icon-button';
import {
  GOT_IT_ACTION_LABEL,
  HIDE_COACH_ARIA_LABEL,
  OPEN_COACH_ARIA_LABEL,
} from './table-copy';

export interface TutorialCoachProps {
  index: number;
  title: string;
  body: string;
  messageKey: string;
  open: boolean;
  onHide: () => void;
  onShow: () => void;
  onAck?: () => void;
  ackLabel?: string;
}

export function TutorialCoach({
  index,
  title,
  body,
  messageKey,
  open,
  onHide,
  onShow,
  onAck,
  ackLabel = GOT_IT_ACTION_LABEL,
}: TutorialCoachProps): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 z-[110]">
      <div className="pointer-events-auto absolute left-2 top-[4.75rem] w-[min(22rem,calc(100vw-1rem))] sm:top-[5.25rem]">
        {open ? (
          <CoachPanel
            key={messageKey}
            title={title}
            body={body}
            zone="tutorial-coach"
            extraAttrs={{
              'data-tutorial-index': String(index),
              'data-tutorial-coach-open': 'true',
            }}
            onHide={onHide}
            hideAriaLabel={HIDE_COACH_ARIA_LABEL}
            {...(onAck !== undefined
              ? {
                  footer: (
                    <Button
                      variant="green"
                      className="w-full"
                      data-tutorial-ack="got-it"
                      onClick={onAck}
                    >
                      {ackLabel}
                    </Button>
                  ),
                }
              : {})}
          />
        ) : (
          <IconButton
            data-zone="tutorial-coach-toggle"
            data-tutorial-coach-open="false"
            aria-label={OPEN_COACH_ARIA_LABEL}
            className="border-2 border-cta-orange bg-cta-orange/20 text-lg font-bold shadow-[0_8px_24px_rgba(28,26,31,0.28)]"
            onClick={onShow}
          >
            ?
          </IconButton>
        )}
      </div>
    </div>
  );
}
