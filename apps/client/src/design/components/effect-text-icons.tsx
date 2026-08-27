/**
 * Inline resource glyphs inside catalog effect / upgradeAdds copy (L51-12).
 */

import type { ReactElement, ReactNode } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../asset-lookup';
import { CostDisplay } from './cost-display';
import { tokenizeEffectResources } from './effect-text-tokens';
import type { StructuredCost } from './structured-cost';

function structuredFromKind(kind: ResourceKind, amount: number): StructuredCost | null {
  if (kind === 'point') {
    return { kind: 'points', amount };
  }
  if (kind === 'life') {
    return { kind: 'lives', amount };
  }
  if (kind === 'upgradePoint') {
    return { kind: 'upgradePoint', amount };
  }
  return null;
}

function InlineAmount({
  kind,
  amount,
}: {
  kind: ResourceKind;
  amount: number;
}): ReactElement {
  const structured = structuredFromKind(kind, amount);
  if (structured !== null) {
    return <CostDisplay cost={structured} iconSize={14} className="align-middle" />;
  }
  return (
    <span className="inline-flex items-center gap-0.5 align-middle font-medium">
      <span>{String(amount)}</span>
      <img
        src={getResourceIconUrl('shield')}
        alt=""
        width={14}
        height={14}
        className="size-3.5 object-contain"
        aria-hidden
      />
    </span>
  );
}

export function EffectTextWithIcons({ text }: { text: string }): ReactElement {
  const spans = tokenizeEffectResources(text);
  if (spans.length === 0) {
    return <>{text}</>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    nodes.push(
      <span key={`res-${String(index)}`} className="inline-flex items-center gap-0.5">
        {span.insteadOf ? <span>instead of </span> : null}
        <InlineAmount kind={span.kind} amount={span.amount} />
      </span>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return <>{nodes}</>;
}
