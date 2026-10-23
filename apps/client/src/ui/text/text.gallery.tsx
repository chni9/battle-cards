/** `/dev/ui` section for cost glyphs and effect copy (technical spec v7 §6.6.1, L72-11). DEV only. */

import { SHARED_CARD_CATALOG, SPECIAL_CARD_CATALOG } from '@card-battle/shared';

import type { GallerySection } from '../../dev/gallery-registry';
import { CostAmount } from '../card/cost-amount';
import { CardEffectCopy } from './card-effect-copy';
import { EffectTextWithIcons } from './effect-text-with-icons';

const frame = 'max-w-sm rounded-v7-chrome bg-v7-panel p-3 text-v7-text';

export const gallery: GallerySection = {
  id: 'text',
  title: 'Text and cost glyphs',
  entries: [
    {
      id: 'cost-amount',
      title: 'CostAmount',
      render: () => (
        <div className={`${frame} flex flex-wrap items-center gap-3`}>
          <CostAmount amount={{ kind: 'points', amount: 3 }} />
          <CostAmount amount={{ kind: 'pointsPerLife', amount: 3 }} />
          <CostAmount amount={{ kind: 'lives', amount: 4 }} />
          <CostAmount amount={{ kind: 'upgradePoint', amount: 2 }} />
          <CostAmount amount={{ kind: 'shield', amount: 4 }} />
          <CostAmount amount={{ kind: 'points', amount: 3 }} signed="cost" />
          <CostAmount amount={{ kind: 'points', amount: 3 }} signed="gain" />
          <CostAmount amount={{ kind: 'points', amount: 4 }} multiplier={2} />
          <CostAmount amount={{ kind: 'points', amount: 3 }} size="lg" />
        </div>
      ),
    },
    {
      id: 'effect-text',
      title: 'Effect text',
      render: () => (
        <div className={`${frame} flex flex-col gap-2`}>
          <p><EffectTextWithIcons text={SHARED_CARD_CATALOG.regeneration.effect} /></p>
          <p><EffectTextWithIcons text={SHARED_CARD_CATALOG.regeneration.upgradeAdds} /></p>
          <p><EffectTextWithIcons text={SPECIAL_CARD_CATALOG.cloning.upgradeAdds} /></p>
          <p><EffectTextWithIcons text={SHARED_CARD_CATALOG.shield.effect} /></p>
          <p><EffectTextWithIcons text={SPECIAL_CARD_CATALOG.block.upgradeAdds} /></p>
        </div>
      ),
    },
    {
      id: 'card-effect-copy',
      title: 'Card effect copy',
      render: () => (
        <div className={`${frame} flex flex-col gap-4`}>
          <CardEffectCopy card={SHARED_CARD_CATALOG.regeneration} isUpgraded={false} />
          <CardEffectCopy card={SHARED_CARD_CATALOG.regeneration} isUpgraded={true} />
          <CardEffectCopy card={SHARED_CARD_CATALOG['basic-attack']} isUpgraded={false} />
          <CardEffectCopy card={SHARED_CARD_CATALOG.tax} isUpgraded={false} />
        </div>
      ),
    },
  ],
};
