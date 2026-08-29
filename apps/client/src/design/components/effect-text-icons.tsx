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
    return <CostDisplay cost={structured} iconSize={16} className="align-middle" />;
  }
  return (
    <span className="inline-flex items-center gap-0.5 align-middle font-medium whitespace-nowrap">
      <span>{String(amount)}</span>
      <img
        src={getResourceIconUrl('shield')}
        alt=""
        width={16}
        height={16}
        className="size-4 object-contain"
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
      <span key={`res-${String(index)}`} className="inline-flex items-center gap-0.5 whitespace-nowrap">
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
