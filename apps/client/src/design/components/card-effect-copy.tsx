/**
 * Card inspect effect body — L51-05 / L51-12. Cost is always icons; upgrade preview is a delta.
 */

import { type Card } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { CostDisplay } from './cost-display';
import { EffectTextWithIcons } from './effect-text-icons';
import { structuredPlayCost } from './structured-cost';

export interface CardEffectCopyProps {
  card: Card;
  isUpgraded: boolean;
}

export function CardEffectCopy({ card, isUpgraded }: CardEffectCopyProps): ReactElement {
  const playCost = structuredPlayCost(card, isUpgraded);
  const effect = isUpgraded ? card.upgradeEffect : card.effect;

  return (
    <div className="space-y-2">
      {playCost !== null ? (
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
          <span>Cost</span>
          <CostDisplay cost={playCost} />
        </p>
      ) : null}
      {effect.length > 0 ? (
        <p className="text-sm leading-snug text-ink">
          <EffectTextWithIcons text={effect} />
        </p>
      ) : null}
      {!isUpgraded ? (
        <p className="rounded-[length:var(--radius-badge)] border border-border-soft bg-surface px-2 py-1.5 text-sm leading-snug text-ink">
          <span className="font-semibold">Upgrade</span>
          <span className="text-ink-muted"> — </span>
          <EffectTextWithIcons text={card.upgradeAdds} />
        </p>
      ) : null}
    </div>
  );
}
