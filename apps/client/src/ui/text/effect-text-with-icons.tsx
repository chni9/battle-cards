/**
 * Inline resource glyphs in catalog effect / upgradeAdds copy
 * (technical spec v7 §6.6.1, L51-12, L72-11).
 */

import type { ReactElement, ReactNode } from 'react';

import { CostAmount } from '../card/cost-amount';
import { glyphAmountFromResource } from '../card/glyph-amount';
import { tokenizeEffectResources } from '../effect-text-tokens';

export interface EffectTextWithIconsProps {
  text: string;
  iconSize?: 'sm' | 'md';
}

export function EffectTextWithIcons({ text, iconSize = 'md' }: EffectTextWithIconsProps): ReactElement {
  const spans = tokenizeEffectResources(text);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    nodes.push(
      <span key={`res-${String(index)}`} className="inline-flex items-center whitespace-nowrap">
        {span.insteadOf ? <span className="whitespace-pre">instead of </span> : null}
        <CostAmount amount={glyphAmountFromResource(span.kind, span.amount)} size={iconSize} />
      </span>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return <>{nodes}</>;
}
