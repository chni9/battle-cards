/**
 * Card effect copy for the card sheet and kit details — technical spec v7 §6.6.1, L51-05,
 * L51-12. Three rows, in this order:
 *
 * 1. **Cost** — the play cost as icons (`structuredPlayCost`); omitted when the card has none.
 *    Regeneration's per-life rate is 3 base and 2 upgraded (rules spec §3).
 * 2. The effect of the card as held: `effect`, or `upgradeEffect` when upgraded.
 * 3. **Upgrade** — `upgradeAdds`, the delta, on a base card only, on its own `--panel-2` row.
 *
 * Catalog text is rendered as it is; this component never rewrites it (L72-13 owns the strings).
 * Text is `--text` on the `--panel` of the sheet; the dash is `--text-2`. `data-effect-part`
 * marks each row for tests and for the card sheet that places it.
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
    <div className="space-y-2 font-v7-body text-v7-body leading-snug font-bold text-v7-text">
      {playCost !== null ? (
        <p data-effect-part="cost" className="flex flex-wrap items-center gap-1.5">
          <span className="font-extrabold">Cost</span>
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
          <span className="font-extrabold">Upgrade</span>
          <span className="text-v7-text-2"> — </span>
          <EffectTextWithIcons text={card.upgradeAdds} />
        </p>
      ) : null}
    </div>
  );
}
