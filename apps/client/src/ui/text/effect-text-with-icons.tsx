/**
 * Inline resource glyphs inside catalog effect and upgrade copy — technical spec v7 §6.6.1,
 * L51-12. Each "4 lives", "3 points", "2 upgrade points" or "4 shield points" phrase becomes
 * number plus icon with a spoken text; "instead of 3" keeps its words and takes the icon of the
 * resource before it. The amounts come from the catalog string itself (`tokenizeEffectResources`),
 * never from a value kept here. Damage, turn counts and card lives are not resource phrases and
 * stay prose. No sign is shown: prose already says whether a player gains or pays.
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
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const span of tokenizeEffectResources(text)) {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    // A nowrap span keeps "instead of" with its amount; it is not a flex container, so the
    // space after "of" survives (a flex item would trim it).
    nodes.push(
      <span key={span.start} className="whitespace-nowrap">
        {span.insteadOf ? 'instead of ' : null}
        <CostAmount amount={glyphAmountFromResource(span.kind, span.amount)} size={iconSize} />
      </span>,
    );
    cursor = span.end;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return <>{nodes}</>;
}
