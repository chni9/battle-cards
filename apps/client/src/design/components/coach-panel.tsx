/**
 * Shared hovering coach chrome — tutorial (L45-05) and first-game hints (L46-01).
 * Not a Dialog: pointer-events stay on the card. Table remains clickable.
 */

import { Fragment, type ReactElement, type ReactNode } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../asset-lookup';
import {
  parseCoachBody,
  type CoachBodyPart,
  type CoachResourceKind,
} from '../../screens/table/tutorial-coach-copy';
import { CostDisplay } from './cost-display';
import { IconButton } from './icon-button';
import type { StructuredCost } from './structured-cost';

export interface CoachPanelProps {
  title: string;
  body: string;
  zone: string;
  onHide: () => void;
  hideAriaLabel: string;
  footer?: ReactNode;
  extraAttrs?: Record<string, string>;
}

export function CoachPanel({
  title,
  body,
  zone,
  onHide,
  hideAriaLabel,
  footer,
  extraAttrs,
}: CoachPanelProps): ReactElement {
  return (
    <aside
      data-zone={zone}
      className="tutorial-coach-panel flex max-h-[min(52vh,28rem)] flex-col overflow-hidden rounded-[length:var(--radius-card)] border-2 border-cta-orange text-ink shadow-[0_16px_40px_rgba(28,26,31,0.38)]"
      {...(extraAttrs ?? {})}
    >
      <div className="flex shrink-0 items-start gap-2 border-b border-cta-orange/40 bg-cta-orange/15 px-3 py-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <IconButton
          aria-label={hideAriaLabel}
          className="h-11 w-11 shrink-0"
          onClick={onHide}
        >
          ×
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <CoachBody text={body} />
      </div>
      {footer !== undefined ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-cta-orange/40 px-3 py-2">
          {footer}
        </div>
      ) : null}
    </aside>
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
