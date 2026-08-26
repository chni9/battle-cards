/**
 * Hovering tutorial coach chat — technical spec v6 §5.4.
 * Not a Dialog: the table stays clickable. Dismissible; reopens on new copy.
 * Skip stays on the table flag only. Tour steps add Got it; Look does not.
 */

import { Fragment, type ReactElement } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../../design/asset-lookup';
import { Button } from '../../design/components/button';
import { CostDisplay } from '../../design/components/cost-display';
import { IconButton } from '../../design/components/icon-button';
import type { StructuredCost } from '../../design/components/structured-cost';
import {
  GOT_IT_ACTION_LABEL,
  HIDE_COACH_ARIA_LABEL,
  OPEN_COACH_ARIA_LABEL,
} from './table-copy';
import {
  parseCoachBody,
  type CoachBodyPart,
  type CoachResourceKind,
} from './tutorial-coach-copy';

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
          <aside
            key={messageKey}
            data-zone="tutorial-coach"
            data-tutorial-index={String(index)}
            data-tutorial-coach-open="true"
            className="tutorial-coach-panel flex max-h-[min(52vh,28rem)] flex-col overflow-hidden rounded-[length:var(--radius-card)] border-2 border-cta-orange text-ink shadow-[0_16px_40px_rgba(28,26,31,0.38)]"
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
            {onAck !== undefined ? (
              <div className="shrink-0 border-t border-cta-orange/40 px-3 py-2">
                <Button
                  variant="green"
                  className="w-full"
                  data-tutorial-ack="got-it"
                  onClick={onAck}
                >
                  {ackLabel}
                </Button>
              </div>
            ) : null}
          </aside>
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

function CoachBody({ text }: { text: string }): ReactElement {
  const parts = parseCoachBody(text);

  return (
    <p className="text-base leading-relaxed text-ink">
      {parts.map((part, index) => (
        <CoachPart key={`p-${String(index)}`} part={part} />
      ))}
    </p>
  );
}

function CoachPart({ part }: { part: CoachBodyPart }): ReactElement {
  if (part.kind === 'text') {
    if (part.bold) {
      return <strong>{part.text}</strong>;
    }
    return <Fragment>{part.text}</Fragment>;
  }

  const cost = structuredCoachCost(part.resource, part.amount);
  const inner =
    cost !== null ? (
      <CostDisplay
        cost={cost}
        iconSize={18}
        className="mx-0.5 align-middle"
        {...(part.sign === '+' ? { signed: 'gain' as const } : {})}
      />
    ) : (
      <>
        {part.amount !== null ? (
          <span className="tabular-nums">
            {part.sign}
            {String(part.amount)}
          </span>
        ) : (
          part.word
        )}
        <CoachResourceGlyph kind={part.resource} />
      </>
    );

  if (part.bold) {
    return <strong className="inline-flex items-baseline">{inner}</strong>;
  }
  return <span className="inline-flex items-baseline">{inner}</span>;
}

function structuredCoachCost(
  resource: CoachResourceKind,
  amount: number | null,
): StructuredCost | null {
  if (amount === null) {
    return null;
  }
  switch (resource) {
    case 'point':
      return { kind: 'points', amount };
    case 'life':
      return { kind: 'lives', amount };
    case 'upgradePoint':
      return { kind: 'upgradePoint', amount };
    case 'shield':
      return null;
  }
}

function CoachResourceGlyph({ kind }: { kind: CoachResourceKind }): ReactElement {
  const resource: ResourceKind = kind;
  return (
    <img
      src={getResourceIconUrl(resource)}
      alt=""
      width={18}
      height={18}
      className="mx-0.5 inline-block size-[1.125rem] shrink-0 object-contain align-text-bottom"
      aria-hidden
    />
  );
}
