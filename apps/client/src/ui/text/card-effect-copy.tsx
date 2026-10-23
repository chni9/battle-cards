/**
 * Card-sheet effect body: Cost row, effect, Upgrade block
 * (technical spec v7 §6.6.1, L51-05, L51-12, rules spec §3, L72-11).
 */

import type { Card } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { CostAmount } from '../card/cost-amount';
import { structuredPlayCost } from '../structured-cost';
import { EffectTextWithIcons } from './effect-text-with-icons';

export interface CardEffectCopyProps {
  card: Card;
  isUpgraded: boolean;
}

export function CardEffectCopy({ card, isUpgraded }: CardEffectCopyProps): ReactElement {
  const playCost = structuredPlayCost(card, isUpgraded);
  const effect = isUpgraded ? card.upgradeEffect : card.effect;
  return (
    <div className="space-y-2 font-v7-body text-v7-body text-v7-text">
      {playCost !== null ? (
        <p data-effect-part="cost" className="flex flex-wrap items-center gap-1.5 font-semibold">
          <span>Cost</span>
          <CostAmount amount={playCost} size="md" />
        </p>
      ) : null}
      {effect.length > 0 ? (
        <p data-effect-part="effect">
          <EffectTextWithIcons text={effect} />
        </p>
      ) : null}
      {!isUpgraded ? (
        <p data-effect-part="upgrade" className="rounded-v7-chrome-sm bg-v7-panel-2 px-2 py-1.5">
          <span className="font-semibold">Upgrade</span>
          <span className="text-v7-text-2"> — </span>
          <EffectTextWithIcons text={card.upgradeAdds} />
        </p>
      ) : null}
    </div>
  );
}
