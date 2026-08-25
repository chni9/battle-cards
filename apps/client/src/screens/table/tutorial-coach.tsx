/**
 * Hovering tutorial coach chat — technical spec v6 §5.4.
 * Not a Dialog: the table stays clickable. Dismissible; reopens on new copy.
 * Skip uses the same leave-to-hub path as the flag.
 */

import { Fragment, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { IconButton } from '../../design/components/icon-button';
import {
  HIDE_COACH_ARIA_LABEL,
  OPEN_COACH_ARIA_LABEL,
  OPEN_COACH_LABEL,
  SKIP_TUTORIAL_ACTION_LABEL,
} from './table-copy';

export interface TutorialCoachProps {
  index: number;
  title: string;
  body: string;
  messageKey: string;
  open: boolean;
  onHide: () => void;
  onShow: () => void;
  onSkip: () => void;
}

export function TutorialCoach({
  index,
  title,
  body,
  messageKey,
  open,
  onHide,
  onShow,
  onSkip,
}: TutorialCoachProps): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 z-[110]">
      <div className="pointer-events-auto absolute left-2 top-[4.75rem] w-[min(22rem,calc(100vw-1rem))] sm:top-[5.25rem]">
        {open ? (
          <aside
            key={messageKey}
            data-zone="tutorial-coach"
            data-tutorial-index={String(index)}
            data-tutorial-coach-open="true"
            className="tutorial-coach-panel flex max-h-[40vh] flex-col overflow-hidden rounded-[length:var(--radius-card)] border-2 border-cta-orange bg-surface-raised text-ink shadow-[0_16px_40px_rgba(28,26,31,0.38)]"
          >
            <div className="flex shrink-0 items-start gap-2 border-b border-cta-orange/40 bg-cta-orange/15 px-3 py-2">
              <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-ink">
                {title}
              </h2>
              <IconButton
                aria-label={HIDE_COACH_ARIA_LABEL}
                className="h-11 w-11 shrink-0"
                onClick={onHide}
              >
                ×
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              <CoachBody text={body} />
            </div>
            <div className="flex shrink-0 justify-end border-t border-border-soft px-3 py-2">
              <Button
                variant="red"
                className="min-h-11 min-w-0 px-3 py-2 text-xs"
                onClick={onSkip}
              >
                {SKIP_TUTORIAL_ACTION_LABEL}
              </Button>
            </div>
          </aside>
        ) : (
          <Button
            variant="orange"
            data-zone="tutorial-coach-toggle"
            data-tutorial-coach-open="false"
            aria-label={OPEN_COACH_ARIA_LABEL}
            className="min-h-11 min-w-0 px-4 shadow-[0_8px_24px_rgba(28,26,31,0.28)]"
            onClick={onShow}
          >
            {OPEN_COACH_LABEL}
          </Button>
        )}
      </div>
    </div>
  );
}

function CoachBody({ text }: { text: string }): ReactElement {
  const chunks = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <p className="text-base leading-relaxed text-ink">
      {chunks.map((chunk, index) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(chunk);
        const inner = bold?.[1];
        if (inner !== undefined) {
          return <strong key={`b-${String(index)}`}>{inner}</strong>;
        }

        return <Fragment key={`t-${String(index)}`}>{chunk}</Fragment>;
      })}
    </p>
  );
}
